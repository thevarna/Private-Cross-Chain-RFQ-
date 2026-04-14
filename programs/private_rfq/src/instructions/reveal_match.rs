//! # Instruction: `reveal_match` (discriminator = 4)
//!
//! This is the **settlement decision instruction** — the moment the protocol
//! transitions from encrypted negotiation to explicit financial resolution.
//!
//! It reads the plaintext decryption result from the `DecryptionRequest` account
//! using the Encrypt SDK's `read_decrypted_verified::<Uint64>()` function.
//! This function implements the digest-verification anti-tampering pattern:
//! it verifies that the stored `pending_digest` matches the result in the request
//! account before accepting the value.
//!
//! ## Branch A: Match (result > 0)
//! - `RfqState.status` → `MATCHED`
//! - `BidState.status` → `ACCEPTED`
//! - USDC transferred from escrow vault to Maker's USDC account
//!
//! ## Branch B: No Match (result == 0)
//! - `RfqState.status` → `ACTIVE` (RFQ remains open for new bids)
//! - `BidState.status` → `REJECTED`
//! - USDC fully refunded from escrow vault to Taker's USDC account
//!
//! ## Accounts
//!
//! ```text
//! [0]   rfq_pda             writable — state transition
//! [1]   bid_pda             writable — state transition
//! [2]   decryption_request  readonly — contains plaintext match result
//! [3]   escrow_vault        writable — USDC token account (PDA-owned)
//! [4]   maker_usdc_acct     writable — Maker receives USDC on match
//! [5]   taker_usdc_acct     writable — Taker receives refund on no-match
//! [6]   vault_authority     readonly — PDA for vault signing [b"vault", rfq_pda]
//! [7]   token_program       readonly
//! ```
//!
//! ## Instruction Data (2 bytes)
//!
//! ```text
//! Offset  Len  Field
//! ─────────────────────────────────────────────────────────
//!      0    1  vault_bump    Bump for vault authority PDA
//!      1    1  <reserved>
//! ```

use pinocchio::{
    cpi::{Seed, Signer},
    AccountView, Address, ProgramResult,
};
use pinocchio::error::ProgramError;
// use pinocchio_token::instructions::Transfer;
use crate::instructions::cpi::TokenTransfer;
use encrypt_pinocchio::accounts::{self};
use encrypt_types::encrypted::Uint64;

use crate::state::{RfqState, BidState, rfq_status, bid_status};
use crate::errors::{
    ERR_DIGEST_MISMATCH, ERR_DECRYPTION_NOT_COMPLETE,
    ERR_MUST_BE_COMPUTING, custom_error,
};

/// Process the `reveal_match` instruction.
pub fn process(
    _program_id: &Address,
    accounts:    &[AccountView],
    data:        &[u8],
) -> ProgramResult {
    // ── Unpack accounts ───────────────────────────────────────────────────────
    let [rfq_pda_acct, bid_pda_acct, decryption_request,
         escrow_vault, maker_usdc_acct, taker_usdc_acct,
         vault_authority, token_program, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // ── Parse instruction data ────────────────────────────────────────────────
    if data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }
    let vault_bump = data[0];

    // ── Read and validate stored state ────────────────────────────────────────
    let rfq_pda_key: [u8; 32];
    let escrow_amount: u64;
    let pending_digest: [u8; 32];
    let stored_decryption_request: [u8; 32];

    {
        let rfq_data = unsafe { rfq_pda_acct.borrow_unchecked() };
        let rfq = RfqState::from_bytes(rfq_data)?;
        if rfq.status != rfq_status::COMPUTING {
            return Err(custom_error(ERR_MUST_BE_COMPUTING));
        }
        rfq_pda_key = *rfq_pda_acct.address().as_array();
    }
    {
        let bid_data = unsafe { bid_pda_acct.borrow_unchecked() };
        let bid = BidState::from_bytes(bid_data)?;
        escrow_amount              = bid.escrow_amount();
        pending_digest             = bid.pending_digest;
        stored_decryption_request  = bid.decryption_request;
    }

    // Verify the decryption_request account matches what was stored
    if *decryption_request.address().as_array() != stored_decryption_request {
        return Err(custom_error(ERR_DIGEST_MISMATCH));
    }

    // ── Read the decrypted match result (digest-verified) ────────────────────
    //
    // `read_decrypted_verified::<Uint64>()` is the official Encrypt pattern for
    // safely reading a decryption result:
    //
    // 1. Verifies `bytes_written == total_len` (decryption is complete)
    // 2. Verifies the stored `ciphertext_digest` matches our `pending_digest`
    //    (ensures result corresponds to the ciphertext we requested)
    // 3. Returns a reference to the plaintext u64 value
    //
    // Returns errors for:
    // - Incomplete decryption  → ERR_DECRYPTION_NOT_COMPLETE
    // - Digest mismatch        → ERR_DIGEST_MISMATCH (tampering detected)
    let req_data = unsafe { decryption_request.borrow_unchecked() };
    let match_value: &u64 = accounts::read_decrypted_verified::<Uint64>(req_data, &pending_digest)
        .map_err(|e| {
            // Distinguish between "not complete yet" and "digest mismatch"
            match e {
                pinocchio::error::ProgramError::InvalidAccountData => {
                    custom_error(ERR_DECRYPTION_NOT_COMPLETE)
                }
                _ => custom_error(ERR_DIGEST_MISMATCH),
            }
        })?;

    // The circuit returns 1 for a match, 0 for no match.
    let is_match = *match_value > 0;

    // ── Vault authority PDA seeds for signing token transfers ─────────────────
    let vault_bump_byte = [vault_bump];
    let vault_seeds = [
        Seed::from(b"vault" as &[u8]),
        Seed::from(rfq_pda_key.as_ref()),
        Seed::from(&vault_bump_byte),
    ];
    let vault_signer = [Signer::from(&vault_seeds)];

    // ── Execute settlement branch ─────────────────────────────────────────────
    if is_match {
        // ── BRANCH A: MATCH ────────────────────────────────────────────────────
        // The Taker's bid satisfies the Maker's sealed terms.
        // Transfer the locked USDC to the Maker as payment for the foreign asset.

        TokenTransfer {
            from:      escrow_vault,
            to:        maker_usdc_acct,
            authority: vault_authority,
            amount:    escrow_amount,
        }
        .invoke_signed(token_program, &vault_signer[..])?;

        // Update state machine
        {
            let rfq_data_mut = unsafe { rfq_pda_acct.borrow_unchecked_mut() };
            RfqState::from_bytes_mut(rfq_data_mut)?.status = rfq_status::MATCHED;
        }
        {
            let bid_data_mut = unsafe { bid_pda_acct.borrow_unchecked_mut() };
            BidState::from_bytes_mut(bid_data_mut)?.status = bid_status::ACCEPTED;
        }
    } else {
        // ── BRANCH B: NO MATCH ────────────────────────────────────────────────
        // The Taker's bid does not satisfy the Maker's sealed terms.
        // Fully refund the Taker's locked USDC. No information about the Maker's
        // actual parameters is revealed by this rejection — only that the bid failed.

        TokenTransfer {
            from:      escrow_vault,
            to:        taker_usdc_acct,
            authority: vault_authority,
            amount:    escrow_amount,
        }
        .invoke_signed(token_program, &vault_signer[..])?;

        // Reset RFQ to Active — Maker's RFQ remains open for new bids
        {
            let rfq_data_mut = unsafe { rfq_pda_acct.borrow_unchecked_mut() };
            let rfq = RfqState::from_bytes_mut(rfq_data_mut)?;
            rfq.status = rfq_status::ACTIVE;
            rfq.set_computing_start_slot(0);
        }
        {
            let bid_data_mut = unsafe { bid_pda_acct.borrow_unchecked_mut() };
            BidState::from_bytes_mut(bid_data_mut)?.status = bid_status::REJECTED;
        }
    }

    Ok(())
}
