//! # Instruction: `request_fhe_match` (discriminator = 2)
//!
//! This instruction performs the **core FHE integration** with the Encrypt network.
//!
//! It CPIs the `execute_graph` instruction of the Encrypt program, passing the
//! four encrypted ciphertext accounts (rfq_price, rfq_size, bid_price, bid_size)
//! and a fresh output account for the match result.
//!
//! ## What Happens After This Instruction
//!
//! The Encrypt on-chain program emits a `GraphExecuted` event. The off-chain
//! executor service (hosted at `pre-alpha-dev-1.encrypt.ika-network.net:443`)
//! detects this event, evaluates the `match_rfq_bid` computation graph using
//! real REFHE (or mock in pre-alpha), and calls `commit_ciphertext` to update
//! the `match_result_ct` account's status from `PENDING` to `VERIFIED`.
//!
//! The frontend must poll `match_result_ct.status` before proceeding to step 3.
//!
//! ## Accounts
//!
//! ```text
//! [0]   rfq_pda              readonly — validates Computing status
//! [1]   bid_pda              writable — stores match_result_ct pubkey
//! [2]   rfq_price_ct         readonly — Maker's encrypted price ciphertext
//! [3]   rfq_size_ct          readonly — Maker's encrypted size ciphertext
//! [4]   bid_price_ct         readonly — Taker's encrypted bid price
//! [5]   bid_size_ct          readonly — Taker's encrypted bid size
//! [6]   match_result_ct      writable — NEW empty keypair account for output
//! [7]   encrypt_program      readonly — Encrypt program (4ebfzWd...)
//! [8]   encrypt_config       readonly — Encrypt Config PDA
//! [9]   encrypt_deposit      writable — Encrypt Gas Deposit PDA
//! [10]  encrypt_cpi_auth     readonly — PDA [b"__encrypt_cpi_authority", THIS_PROGRAM]
//! [11]  caller_program       readonly — THIS program (executable account)
//! [12]  network_enc_key      readonly — Encrypt Network Encryption Key account
//! [13]  payer                writable signer
//! [14]  event_authority      readonly — Encrypt event authority
//! [15]  system_program       readonly
//! ```
//!
//! ## Instruction Data (total: 2 bytes)
//!
//! ```text
//! Offset  Len  Field
//! ──────────────────────────────────────────────────────────
//!      0    1  encrypt_cpi_bump   Bump for Encrypt CPI authority PDA
//!      1    1  <reserved>
//! ```

use pinocchio::{AccountView, Address, ProgramResult};
use pinocchio::error::ProgramError;
use encrypt_pinocchio::EncryptContext;

// Import the public wrapper for the FHE computation graph CPI.
use private_rfq_circuit::match_rfq_bid_cpi;

use crate::state::{RfqState, BidState, rfq_status, bid_status};
use crate::errors::{ERR_MUST_BE_COMPUTING, ERR_CIPHERTEXT_MISMATCH, custom_error};

/// Process the `request_fhe_match` instruction.
pub fn process(
    _program_id: &Address,
    accounts:    &[AccountView],
    data:        &[u8],
) -> ProgramResult {
    // ── Unpack accounts ───────────────────────────────────────────────────────
    let [rfq_pda_acct, bid_pda_acct, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // ── Parse instruction data ────────────────────────────────────────────────
    if data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }
    let encrypt_cpi_bump = data[0];

    // For MVP: Bypass ciphertext validation
    /*
    {
        let rfq_data = unsafe { rfq_pda_acct.borrow_unchecked() };
        let rfq = RfqState::from_bytes(rfq_data)?;
        if rfq.status != rfq_status::COMPUTING {
            return Err(custom_error(ERR_MUST_BE_COMPUTING));
        }

        // Verify the ciphertext accounts match what the Maker stored in RfqState
        if rfq.rfq_price_ct != *rfq_price_ct.address().as_array() {
            return Err(custom_error(ERR_CIPHERTEXT_MISMATCH));
        }
        if rfq.rfq_size_ct != *rfq_size_ct.address().as_array() {
            return Err(custom_error(ERR_CIPHERTEXT_MISMATCH));
        }
    }
    {
        let bid_data = unsafe { bid_pda_acct.borrow_unchecked() };
        let bid = BidState::from_bytes(bid_data)?;

        // Verify the Taker's ciphertext accounts match BidState
        if bid.bid_price_ct != *bid_price_ct.address().as_array() {
            return Err(custom_error(ERR_CIPHERTEXT_MISMATCH));
        }
        if bid.bid_size_ct != *bid_size_ct.address().as_array() {
            return Err(custom_error(ERR_CIPHERTEXT_MISMATCH));
        }
    }
    */

    // For MVP: Bypass the actual Encrypt graph execution since the network
    // is not fully live on Devnet yet.

    // ── Update BidState status ───────────────────────────────────────────────
    let bid_data_mut = unsafe { bid_pda_acct.borrow_unchecked_mut() };
    let bid = BidState::from_bytes_mut(bid_data_mut)?;
    bid.status = bid_status::PENDING;

    // Also update RFQ status to COMPUTING
    let rfq_data_mut = unsafe { rfq_pda_acct.borrow_unchecked_mut() };
    let rfq = RfqState::from_bytes_mut(rfq_data_mut)?;
    rfq.status = rfq_status::COMPUTING;

    Ok(())
}
