//! # Instruction: `execute_settlement` (discriminator = 5)
//!
//! The Maker calls this instruction after a successful FHE match to authorize
//! the Ika network to release the foreign asset from the dWallet.
//!
//! ## Ika dWallet Integration
//!
//! This instruction CPIs the `approve_message` instruction of the Ika dWallet
//! program, creating a `MessageApproval` PDA on-chain.
//!
//! The Ika network monitors for new `MessageApproval` PDAs. Upon detection,
//! the NOA (Network Operated Authority — 2PC-MPC validators) collaboratively:
//! 1. Verify the approval is legitimate
//! 2. Generate a signature via the 2PC-MPC protocol
//! 3. Call `CommitSignature` to write the signature into the PDA
//!
//! The Maker's client reads the signature from the `MessageApproval` account
//! (polls until `status == 1 = Signed`) and broadcasts it to the foreign chain
//! (e.g., a Bitcoin transaction).
//!
//! ## Zero-Trust Guarantee
//!
//! This CPI will ONLY succeed if:
//! - The RFQ is in `MATCHED` state (FHE proved the bid was valid)
//! - The Maker is the transaction signer
//! - The dWallet's authority equals THIS program's CPI authority PDA
//!
//! The Ika network verifies the CPI call chain independently, ensuring no
//! single party can forge a signing authorization.
//!
//! ## Accounts
//!
//! ```text
//! [0]   rfq_pda             writable — state → Settled
//! [1]   maker               readonly signer
//! [2]   dwallet_coordinator readonly — Ika DWalletCoordinator PDA (epoch info)
//! [3]   message_approval    writable, empty — MessageApproval PDA to create
//! [4]   dwallet_pda         readonly — the Ika dWallet account (stored in rfq.dwallet_pubkey)
//! [5]   ika_cpi_authority   readonly — PDA [b"__ika_cpi_authority", THIS_PROGRAM]
//! [6]   caller_program      readonly — THIS program (executable)
//! [7]   ika_program         readonly — Ika dWallet program (87W54k...)
//! [8]   payer               writable signer
//! [9]   system_program      readonly
//! ```
//!
//! ## Instruction Data (total: 100 bytes)
//!
//! ```text
//! Offset  Len  Field
//! ─────────────────────────────────────────────────────────
//!      0    1  ika_cpi_bump              Bump for Ika CPI authority PDA
//!      1   32  message_digest            keccak256 of the foreign-chain TX message
//!     33   32  message_metadata_digest   keccak256 of metadata (or [0;32] if none)
//!     65   32  user_pubkey               Maker's public key (for Ika signing context)
//!     97    2  signature_scheme          DWalletSignatureScheme u16 LE (e.g., 2=EcdsaDoubleSha256 for BTC)
//!     99    1  message_approval_bump     MessageApproval PDA bump
//! ```

use pinocchio::{AccountView, Address, ProgramResult};
use pinocchio::error::ProgramError;
use ika_dwallet_pinocchio::DWalletContext;

use crate::state::{RfqState, rfq_status};
use crate::errors::{ERR_NOT_MATCHED, ERR_UNAUTHORIZED, custom_error};

/// Process the `execute_settlement` instruction.
pub fn process(
    _program_id: &Address,
    accounts:    &[AccountView],
    data:        &[u8],
) -> ProgramResult {
    // ── Unpack accounts ───────────────────────────────────────────────────────
    let [rfq_pda_acct, maker,
         dwallet_coordinator, message_approval, dwallet_pda,
         ika_cpi_authority, caller_program, ika_program,
         payer, system_program, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // ── Validate signer ───────────────────────────────────────────────────────
    if !maker.is_signer() {
        return Err(custom_error(ERR_UNAUTHORIZED));
    }

    // ── Parse instruction data ────────────────────────────────────────────────
    if data.len() < 100 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let ika_cpi_bump           = data[0];
    let message_digest:      [u8; 32] = data[1..33].try_into().unwrap();
    let msg_metadata_digest: [u8; 32] = data[33..65].try_into().unwrap();
    let user_pubkey:         [u8; 32] = data[65..97].try_into().unwrap();
    let signature_scheme: u16         = u16::from_le_bytes(data[97..99].try_into().unwrap());
    let msg_approval_bump              = data[99];

    // ── Validate RFQ state ────────────────────────────────────────────────────
    {
        let rfq_data = unsafe { rfq_pda_acct.borrow_unchecked() };
        let rfq = RfqState::from_bytes(rfq_data)?;

        // Gate: only allow settlement if FHE confirmed a match
        if rfq.status != rfq_status::MATCHED {
            return Err(custom_error(ERR_NOT_MATCHED));
        }

        // Verify the maker calling this is the original RFQ creator
        if rfq.maker != *maker.address().as_array() {
            return Err(custom_error(ERR_UNAUTHORIZED));
        }

        // Verify the provided dWallet account matches the stored one
        if rfq.dwallet_pubkey != *dwallet_pda.address().as_array() {
            return Err(ProgramError::InvalidAccountData);
        }
    }

    // ── Build Ika DWalletContext ───────────────────────────────────────────────
    //
    // DWalletContext encapsulates the CPI mechanism for calling dWallet instructions.
    // The `cpi_authority` is this program's PDA:
    //   Seeds: [b"__ika_cpi_authority"], program = PRIVATE_RFQ_PROGRAM_ID
    //
    // When the dWallet's authority was set to this PDA (done by the Maker before
    // calling initialize_rfq), ONLY this program can approve signing requests.
    // The Ika program verifies the CPI call chain to prevent unauthorized use.
    let ctx = DWalletContext {
        dwallet_program:    ika_program,
        cpi_authority:      ika_cpi_authority,
        caller_program,
        cpi_authority_bump: ika_cpi_bump,
    };

    // ── CPI: approve_message → create MessageApproval PDA ────────────────────
    //
    // This CPI call:
    // 1. Creates the `MessageApproval` PDA on-chain (status = Pending).
    // 2. The Ika network's NOA (Network Operated Authority) continuously monitors
    //    for new MessageApproval PDAs.
    // 3. Upon detection, the NOA runs the 2PC-MPC signing protocol.
    // 4. The NOA calls `CommitSignature` to write the signature into the PDA.
    //
    // The `message_digest` is keccak256(foreign_chain_tx_bytes).
    // For Bitcoin: keccak256 is used as the on-chain identifier (the dWallet
    // program treats it as opaque 32 bytes). The actual signing uses DoubleSha256
    // (BIP143) as specified by `signature_scheme = EcdsaDoubleSha256`.
    //
    // CPI instruction data format:
    // [8, bump, message_digest(32), message_metadata_digest(32), user_pubkey(32), scheme(2)]
    ctx.approve_message(
        dwallet_coordinator,
        message_approval,
        dwallet_pda,
        payer,
        system_program,
        message_digest,
        msg_metadata_digest,
        user_pubkey,
        signature_scheme,
        msg_approval_bump,
    )?;

    // ── Advance RFQ state to Settled ──────────────────────────────────────────
    {
        let rfq_data_mut = unsafe { rfq_pda_acct.borrow_unchecked_mut() };
        RfqState::from_bytes_mut(rfq_data_mut)?.status = rfq_status::SETTLED;
    }

    Ok(())
}
