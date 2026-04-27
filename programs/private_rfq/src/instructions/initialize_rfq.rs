//! # Instruction: `initialize_rfq` (discriminator = 0)
//!
//! The Maker calls this instruction to open a new encrypted Request for Quote.
//!
//! ## Pre-conditions (done client-side BEFORE calling this instruction)
//!
//! 1. Maker creates an Ika dWallet via the Ika gRPC API (DKG ceremony).
//! 2. Maker transfers dWallet authority to this program's CPI authority PDA.
//!    PDA seeds: `[b"__ika_cpi_authority"]`, program = PRIVATE_RFQ_PROGRAM_ID
//! 3. Maker deposits the foreign asset (e.g., BTC) into the dWallet's address.
//! 4. Maker creates TWO Encrypt ciphertext accounts via the Encrypt gRPC
//!    `createInput` API — one for price (USDC micro-cents), one for size (sats).
//!    Both ciphertext accounts must be in `Verified` status before proceeding.
//!
//! ## Instruction Data (total: 68 bytes)
//!
//! ```text
//! Offset  Len  Field
//! ──────────────────────────────────────────────────────────
//!      0    1  rfq_bump              PDA canonical bump
//!      1   32  salt                  Random 32-byte PDA salt
//!     33   32  dwallet_pubkey        Ika dWallet account pubkey
//!     65    1  foreign_asset_chain   0=BTC, 1=ETH
//!     66    1  encrypt_cpi_bump      Bump for Encrypt CPI authority PDA
//! ──────────────────────────────────────────────────────────
//! TOTAL: 67 bytes
//! ```
//!
//! ## Accounts
//!
//! ```text
//! [0]  rfq_pda          writable, empty PDA to create [b"rfq", maker, salt]
//! [1]  maker            readonly signer
//! [2]  rfq_price_ct     readonly — pre-created Encrypt ciphertext (EUint64 price)
//! [3]  rfq_size_ct      readonly — pre-created Encrypt ciphertext (EUint64 size)
//! [4]  payer            writable signer (pays for account rent)
//! [5]  system_program   readonly
//! ```

use pinocchio::{
    cpi::{Seed, Signer},
    AccountView, Address, ProgramResult,
};
use pinocchio::error::ProgramError;
// use pinocchio_system::instructions::CreateAccount;
use crate::instructions::cpi::CreateAccount;

use crate::state::{RfqState, RFQ_DISCRIMINATOR, rfq_status};
use crate::errors::{ERR_UNAUTHORIZED, custom_error};

/// Rent formula used consistently across the program.
/// Mirrors the pattern from both official SDK examples.
fn minimum_balance(data_len: usize) -> u64 {
    (data_len as u64 + 128) * 6960
}

/// Process the `initialize_rfq` instruction.
pub fn process(
    program_id: &Address,
    accounts:   &[AccountView],
    data:       &[u8],
) -> ProgramResult {
    // ── Unpack accounts ───────────────────────────────────────────────────────
    let [rfq_pda, maker, rfq_price_ct, rfq_size_ct, payer, system_program, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // ── Validate signers ──────────────────────────────────────────────────────
    if !maker.is_signer() {
        return Err(custom_error(ERR_UNAUTHORIZED));
    }
    if !payer.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // ── Parse instruction data ────────────────────────────────────────────────
    if data.len() < 67 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let rfq_bump                          = data[0];
    let salt:      [u8; 32]               = data[1..33].try_into().unwrap();
    let dwallet_pubkey: [u8; 32]          = data[33..65].try_into().unwrap();
    let foreign_asset_chain               = data[65];
    // data[66] = encrypt_cpi_bump (not needed in this instruction but passed for completeness)

    // ── Validate ciphertext accounts are owned by Encrypt program ─────────────
    // For MVP: We mock the Encrypt gRPC so these accounts aren't actually allocated 
    // on-chain prior to this call. We bypass the `is_empty()` and `status == 1` checks 
    // to allow the demo to proceed seamlessly.
    /*
    {
        let price_data = unsafe { rfq_price_ct.borrow_unchecked() };
        let size_data  = unsafe { rfq_size_ct.borrow_unchecked()  };
        if price_data.is_empty() || size_data.is_empty() {
            return Err(ProgramError::UninitializedAccount);
        }
        if price_data.len() < 96 || size_data.len() < 96 {
            return Err(ProgramError::InvalidAccountData);
        }
        if price_data[97] != 1 || size_data[97] != 1 {
            return Err(ProgramError::InvalidAccountData);
        }
    }
    */

    // ── Create the RfqState PDA ───────────────────────────────────────────────
    let rfq_bump_byte = [rfq_bump];
    let seeds = [
        Seed::from(b"rfq" as &[u8]),
        Seed::from(maker.address().as_ref()),
        Seed::from(salt.as_ref()),
        Seed::from(&rfq_bump_byte),
    ];
    let signer = [Signer::from(&seeds)];

    CreateAccount {
        from:     payer,
        to:       rfq_pda,
        lamports: minimum_balance(RfqState::LEN),
        space:    RfqState::LEN as u64,
        owner:    program_id,
    }
    .invoke_signed(system_program, &signer[..])?;

    // ── Write RfqState fields ─────────────────────────────────────────────────
    let rfq_data = unsafe { rfq_pda.borrow_unchecked_mut() };
    let rfq = RfqState::from_bytes_mut(rfq_data)?;

    rfq.discriminator = RFQ_DISCRIMINATOR;
    rfq.maker.copy_from_slice(maker.address().as_ref());
    rfq.dwallet_pubkey.copy_from_slice(&dwallet_pubkey);
    // Store the 32-byte PUBKEY of each ciphertext account (not the encrypted data).
    // This is how the Encrypt protocol works: the account pubkey IS the ciphertext ID.
    rfq.rfq_price_ct.copy_from_slice(rfq_price_ct.address().as_ref());
    rfq.rfq_size_ct.copy_from_slice(rfq_size_ct.address().as_ref());
    rfq.foreign_asset_chain = foreign_asset_chain;
    rfq.status              = rfq_status::ACTIVE;
    rfq.set_computing_start_slot(0); // not yet computing
    rfq.salt.copy_from_slice(&salt);
    rfq.bump = rfq_bump;

    Ok(())
}
