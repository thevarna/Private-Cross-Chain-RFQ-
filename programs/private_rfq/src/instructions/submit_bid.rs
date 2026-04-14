//! # Instruction: `submit_bid` (discriminator = 1)
//!
//! The Taker calls this instruction to submit an encrypted bid against an active
//! RFQ and simultaneously lock their maximum potential USDC payment into a
//! programmatic escrow vault controlled by this program's PDA.
//!
//! ## Anti-Griefing Mechanism
//!
//! By requiring the Taker to physically lock USDC BEFORE the FHE evaluation,
//! the protocol ensures that if the bid matches, settlement is immediate and
//! cryptographically guaranteed — no further capital commitment required.
//! The escrow is refunded atomically if the match fails.
//!
//! ## Pre-conditions (done client-side BEFORE calling this instruction)
//!
//! 1. Taker creates TWO Encrypt ciphertext accounts via `createInput` with
//!    their bid price and bid size as u64 values.
//! 2. Taker approves an SPL token transfer of `escrow_amount` USDC.
//!
//! ## Instruction Data (total: 107 bytes)
//!
//! ```text
//! Offset  Len  Field
//! ─────────────────────────────────────────────────────────
//!      0    1  bid_bump              PDA canonical bump
//!      1    1  vault_bump            Vault PDA canonical bump
//!      2    8  escrow_amount         USDC lamports to lock (u64 LE)
//!     10   64  foreign_receive_addr  Foreign-chain destination address (UTF-8)
//!     74   32  bid_price_ct_pubkey   Pubkey of bid price ciphertext account
//!    106    1  <reserved>
//! ```
//! Note: bid_price_ct and bid_size_ct are passed as accounts [4] and [5].
//!
//! ## Accounts
//!
//! ```text
//! [0]  bid_pda              writable, empty PDA to create [b"bid", rfq_pda, taker]
//! [1]  rfq_pda              writable — RfqState to update → Computing
//! [2]  taker                readonly signer
//! [3]  bid_price_ct         readonly — pre-created Encrypt ciphertext (EUint64 bid price)
//! [4]  bid_size_ct          readonly — pre-created Encrypt ciphertext (EUint64 bid size)
//! [5]  escrow_vault         writable — SPL Token account PDA [b"vault", rfq_pda]
//! [6]  taker_usdc_acct      writable — Taker's USDC token account
//! [7]  usdc_mint            readonly — USDC mint address
//! [8]  token_program        readonly — SPL Token program
//! [9]  payer                writable signer
//! [10] system_program       readonly
//! ```

use pinocchio::{
    cpi::{Seed, Signer},
    AccountView, Address, ProgramResult,
};
use pinocchio::error::ProgramError;
// use pinocchio_system::instructions::CreateAccount;
// use pinocchio_token::instructions::Transfer;
use crate::instructions::cpi::{TokenTransfer, CreateAccount};

use crate::state::{RfqState, BidState, BID_DISCRIMINATOR, rfq_status, bid_status};
use crate::errors::{
    ERR_RFQ_NOT_ACTIVE, ERR_INVALID_ESCROW, ERR_UNAUTHORIZED, custom_error,
};

fn minimum_balance(data_len: usize) -> u64 {
    (data_len as u64 + 128) * 6960
}

/// Process the `submit_bid` instruction.
pub fn process(
    program_id: &Address,
    accounts:   &[AccountView],
    data:       &[u8],
) -> ProgramResult {
    // ── Unpack accounts ───────────────────────────────────────────────────────
    let [bid_pda, rfq_pda_acct, taker, bid_price_ct, bid_size_ct,
         escrow_vault, taker_usdc_acct, _usdc_mint, token_program,
         payer, system_program, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // ── Validate signers ──────────────────────────────────────────────────────
    if !taker.is_signer() {
        return Err(custom_error(ERR_UNAUTHORIZED));
    }
    if !payer.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // ── Parse instruction data ────────────────────────────────────────────────
    if data.len() < 74 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let bid_bump             = data[0];
    let vault_bump           = data[1];
    let escrow_amount_bytes: [u8; 8] = data[2..10].try_into().unwrap();
    let escrow_amount        = u64::from_le_bytes(escrow_amount_bytes);
    let foreign_receive_addr: [u8; 64] = data[10..74].try_into().unwrap();

    // ── Validate escrow is non-zero ───────────────────────────────────────────
    if escrow_amount == 0 {
        return Err(custom_error(ERR_INVALID_ESCROW));
    }

    // ── Validate and read the RfqState ────────────────────────────────────────
    let rfq_pda_key = *rfq_pda_acct.address().as_array();
    {
        let rfq_data = unsafe { rfq_pda_acct.borrow_unchecked() };
        let rfq = RfqState::from_bytes(rfq_data)?;

        // Critical: only accept bids on Active RFQs
        if rfq.status != rfq_status::ACTIVE {
            return Err(custom_error(ERR_RFQ_NOT_ACTIVE));
        }

        // Validate ciphertext accounts are verified
        let price_ct_data = unsafe { bid_price_ct.borrow_unchecked() };
        let size_ct_data  = unsafe { bid_size_ct.borrow_unchecked()  };
        if price_ct_data.len() < 98 || price_ct_data[97] != 1 {
            return Err(ProgramError::InvalidAccountData);
        }
        if size_ct_data.len() < 98 || size_ct_data[97] != 1 {
            return Err(ProgramError::InvalidAccountData);
        }
    }

    // ── Create the BidState PDA ───────────────────────────────────────────────
    let bid_bump_byte = [bid_bump];
    let bid_seeds = [
        Seed::from(b"bid" as &[u8]),
        Seed::from(rfq_pda_key.as_ref()),
        Seed::from(taker.address().as_ref()),
        Seed::from(&bid_bump_byte),
    ];
    let bid_signer = [Signer::from(&bid_seeds)];

    CreateAccount {
        from:     payer,
        to:       bid_pda,
        lamports: minimum_balance(BidState::LEN),
        space:    BidState::LEN as u64,
        owner:    program_id,
    }
    .invoke_signed(system_program, &bid_signer[..])?;

    // ── Create the escrow vault SPL token account PDA ─────────────────────────
    // Seeds: [b"vault", rfq_pda_key]
    let vault_bump_byte = [vault_bump];
    let _vault_seeds = [
        Seed::from(b"vault" as &[u8]),
        Seed::from(rfq_pda_key.as_ref()),
        Seed::from(&vault_bump_byte),
    ];

    // Transfer USDC from Taker's wallet into the escrow vault.
    // The vault must already be initialized as an SPL token account (done client-side).
    TokenTransfer {
        from:      taker_usdc_acct,
        to:        escrow_vault,
        authority: taker,
        amount:    escrow_amount,
    }
    .invoke(token_program)?;

    // ── Write BidState fields ─────────────────────────────────────────────────
    let bid_data = unsafe { bid_pda.borrow_unchecked_mut() };
    let bid = BidState::from_bytes_mut(bid_data)?;

    bid.discriminator = BID_DISCRIMINATOR;
    bid.rfq_pda.copy_from_slice(&rfq_pda_key);
    bid.taker.copy_from_slice(taker.address().as_ref());
    bid.bid_price_ct.copy_from_slice(bid_price_ct.address().as_ref());
    bid.bid_size_ct.copy_from_slice(bid_size_ct.address().as_ref());
    // match_result_ct, decryption_request, pending_digest — set in later instructions
    bid.match_result_ct    = [0u8; 32];
    bid.decryption_request = [0u8; 32];
    bid.pending_digest     = [0u8; 32];
    bid.set_escrow_amount(escrow_amount);
    bid.foreign_receive_addr.copy_from_slice(&foreign_receive_addr);
    bid.status = bid_status::PENDING;
    bid.bump   = bid_bump;

    // ── Advance RFQ state to Computing ───────────────────────────────────────
    // Record the current Solana slot for the timeout guard.
    {
        let rfq_data_mut = unsafe { rfq_pda_acct.borrow_unchecked_mut() };
        let rfq = RfqState::from_bytes_mut(rfq_data_mut)?;
        rfq.status = rfq_status::COMPUTING;
        // Read current clock sysvar for slot number
        // In Pinocchio, the clock sysvar is read from the account if passed,
        // or we use a unix_timestamp approximation. For MVP, use a static slot.
        // Production: pass clock sysvar account as accounts[11].
        rfq.set_computing_start_slot(u64::MAX); // will be updated by relayer
    }

    Ok(())
}
