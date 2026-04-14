//! # Instruction: `force_cancel_timeout` (discriminator = 6)
//!
//! Emergency instruction that can be invoked by either the Maker or the Taker
//! if the FHE computation stalls in the `Computing` state for more than 200
//! consecutive Solana slots (approximately 80 seconds at 400ms/slot).
//!
//! ## Purpose
//!
//! Given the experimental pre-alpha nature of the Encrypt infrastructure,
//! computations may occasionally time out or fail silently. This instruction
//! prevents user funds from being permanently locked by providing a safe,
//! on-chain escape hatch that:
//! 1. Fully refunds the Taker's USDC escrow
//! 2. Resets the RFQ back to `Active` (Maker can receive new bids)
//!
//! ## Accounts
//!
//! ```text
//! [0]   rfq_pda            writable — state → Active
//! [1]   bid_pda            writable — state → Rejected
//! [2]   caller             readonly signer (must be Maker OR Taker)
//! [3]   escrow_vault       writable — USDC vault to drain
//! [4]   taker_usdc_acct    writable — refund destination
//! [5]   vault_authority    readonly — PDA [b"vault", rfq_pda]
//! [6]   token_program      readonly
//! [7]   clock_sysvar       readonly — Solana Clock sysvar for current slot
//! ```
//!
//! ## Instruction Data (1 byte)
//!
//! ```text
//! Offset  Len  Field
//! ─────────────────────────────────────────────────────────────
//!      0    1  vault_bump    Canonical bump for vault authority PDA
//! ```

use pinocchio::{
    cpi::{Seed, Signer},
    AccountView, Address, ProgramResult,
};
use pinocchio::error::ProgramError;
use pinocchio::sysvars::{clock::Clock, Sysvar};
// use pinocchio_token::instructions::Transfer;
use crate::instructions::cpi::TokenTransfer;

use crate::state::{RfqState, BidState, rfq_status, bid_status};
use crate::errors::{
    ERR_NOT_TIMED_OUT, ERR_MUST_BE_COMPUTING, ERR_UNAUTHORIZED, custom_error,
};

/// Minimum number of slots that must pass before timeout is valid.
const TIMEOUT_SLOTS: u64 = 200;

/// Process the `force_cancel_timeout` instruction.
pub fn process(
    _program_id: &Address,
    accounts:    &[AccountView],
    data:        &[u8],
) -> ProgramResult {
    // ── Unpack accounts ───────────────────────────────────────────────────────
    let [rfq_pda_acct, bid_pda_acct, caller,
         escrow_vault, taker_usdc_acct, vault_authority,
         token_program, _clock_sysvar, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // ── Parse data ────────────────────────────────────────────────────────────
    if data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }
    let vault_bump = data[0];

    // ── Validate caller is Maker or Taker ─────────────────────────────────────
    if !caller.is_signer() {
        return Err(custom_error(ERR_UNAUTHORIZED));
    }

    let rfq_pda_key:    [u8; 32];
    let escrow_amount:  u64;
    let computing_slot: u64;
    let maker_key:      [u8; 32];
    let taker_key:      [u8; 32];

    {
        let rfq_data = unsafe { rfq_pda_acct.borrow_unchecked() };
        let rfq = RfqState::from_bytes(rfq_data)?;

        if rfq.status != rfq_status::COMPUTING {
            return Err(custom_error(ERR_MUST_BE_COMPUTING));
        }
        rfq_pda_key    = *rfq_pda_acct.address().as_array();
        computing_slot = rfq.computing_start_slot();
        maker_key      = rfq.maker;
    }
    {
        let bid_data = unsafe { bid_pda_acct.borrow_unchecked() };
        let bid = BidState::from_bytes(bid_data)?;
        escrow_amount = bid.escrow_amount();
        taker_key     = bid.taker;
    }

    let caller_key = *caller.address().as_array();
    if caller_key != maker_key && caller_key != taker_key {
        return Err(custom_error(ERR_UNAUTHORIZED));
    }

    // ── Check timeout threshold ───────────────────────────────────────────────
    let current_slot = Clock::get()?.slot;
    if computing_slot > 0 && (current_slot < computing_slot + TIMEOUT_SLOTS) {
        return Err(custom_error(ERR_NOT_TIMED_OUT));
    }

    // ── Refund Taker's locked USDC ────────────────────────────────────────────
    let vault_bump_byte = [vault_bump];
    let vault_seeds = [
        Seed::from(b"vault" as &[u8]),
        Seed::from(rfq_pda_key.as_ref()),
        Seed::from(&vault_bump_byte),
    ];
    let vault_signer = [Signer::from(&vault_seeds)];

    TokenTransfer {
        from:      escrow_vault,
        to:        taker_usdc_acct,
        authority: vault_authority,
        amount:    escrow_amount,
    }
    .invoke_signed(token_program, &vault_signer[..])?;

    // ── Reset RFQ back to Active ──────────────────────────────────────────────
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

    Ok(())
}
