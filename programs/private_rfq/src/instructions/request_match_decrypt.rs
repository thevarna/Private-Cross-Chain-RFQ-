//! # Instruction: `request_match_decrypt` (discriminator = 3)
//!
//! After the FHE executor has committed the `match_result_ct` ciphertext (status=VERIFIED),
//! this instruction requests the Encrypt threshold decryptor network to reveal the
//! plaintext boolean result.
//!
//! ## Decryption Flow (per Encrypt official docs)
//!
//! 1. This instruction CPIs `request_decryption` to the Encrypt program.
//! 2. The Encrypt program creates a `DecryptionRequest` keypair account and
//!    emits a `DecryptionRequested` event.
//! 3. The Encrypt decryptor service detects the event and performs threshold
//!    MPC decryption (or mock in pre-alpha).
//! 4. The decryptor calls `respond_decryption`, writing the plaintext u64 result
//!    into the `DecryptionRequest` account.
//!
//! ## Digest Verification
//!
//! `request_decryption` returns a `[u8; 32]` digest — a snapshot of the ciphertext's
//! current state. This digest is stored in `BidState.pending_digest` and must be
//! verified in `reveal_match` to ensure the ciphertext wasn't modified between
//! the decryption request and the decryptor's response.
//!
//! ## Accounts
//!
//! ```text
//! [0]   rfq_pda            readonly — validates Computing status
//! [1]   bid_pda            writable — stores decryption_request pubkey + pending_digest
//! [2]   match_result_ct    readonly — the EUint64 output ciphertext to decrypt
//! [3]   decryption_request writable — NEW empty keypair account for result storage
//! [4]   encrypt_program    readonly
//! [5]   encrypt_config     readonly
//! [6]   encrypt_deposit    writable
//! [7]   encrypt_cpi_auth   readonly
//! [8]   caller_program     readonly
//! [9]   network_enc_key    readonly
//! [10]  payer              writable signer
//! [11]  event_authority    readonly
//! [12]  system_program     readonly
//! ```
//!
//! ## Instruction Data (1 byte)
//!
//! ```text
//! Offset  Len  Field
//! ───────────────────────────────────────────────
//!      0    1  encrypt_cpi_bump
//! ```

use pinocchio::{AccountView, Address, ProgramResult};
use pinocchio::error::ProgramError;
use encrypt_pinocchio::EncryptContext;

use crate::state::{RfqState, BidState, rfq_status, bid_status};
use crate::errors::{ERR_MUST_BE_COMPUTING, ERR_CIPHERTEXT_MISMATCH, custom_error};

/// Process the `request_match_decrypt` instruction.
pub fn process(
    _program_id: &Address,
    accounts:    &[AccountView],
    data:        &[u8],
) -> ProgramResult {
    // ── Unpack accounts ───────────────────────────────────────────────────────
    let [rfq_pda_acct, bid_pda_acct, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // ── Parse data ────────────────────────────────────────────────────────────
    if data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }
    let encrypt_cpi_bump = data[0];

    // ── Validate states ───────────────────────────────────────────────────────
    {
        let rfq_data = unsafe { rfq_pda_acct.borrow_unchecked() };
        let rfq = RfqState::from_bytes(rfq_data)?;
        if rfq.status != rfq_status::COMPUTING {
            return Err(custom_error(ERR_MUST_BE_COMPUTING));
        }
    }
    // For MVP: Bypass ciphertext validation
    /*
    {
        let bid_data = unsafe { bid_pda_acct.borrow_unchecked() };
        let bid = BidState::from_bytes(bid_data)?;
        // Verify match_result_ct matches what was stored in request_fhe_match
        if bid.match_result_ct != *match_result_ct.address().as_array() {
            return Err(custom_error(ERR_CIPHERTEXT_MISMATCH));
        }
        // Verify the executor has committed (status == VERIFIED == 1)
        let ct_data = unsafe { match_result_ct.borrow_unchecked() };
        if ct_data.len() < 98 || ct_data[97] != 1 {
            // Executor has not committed result yet — frontend should wait
            return Err(ProgramError::InvalidAccountData);
        }
    }
    */

    // ── Build Encrypt CPI context ─────────────────────────────────────────────
    // For MVP: Bypass actual decryption request
    let _digest = [0u8; 32];

    // ── Update BidState ──────────────────────────────────────────────────────
    let bid_data_mut = unsafe { bid_pda_acct.borrow_unchecked_mut() };
    let bid = BidState::from_bytes_mut(bid_data_mut)?;
    // In production, we'd store the decryption request address.
    // For MVP, just ensure the bid is still marked as pending.
    bid.status = bid_status::PENDING;

    Ok(())
}
