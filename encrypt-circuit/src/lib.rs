//! # Private RFQ — Encrypted Matching Circuit
//!
//! This crate defines the **Fully Homomorphic Encryption (FHE) computation graph**
//! that performs the core privacy-preserving matching logic for the RFQ Desk.
//!
//! ## Architecture
//!
//! Using the Encrypt network's **REFHE** (Ring-Enhanced FHE) protocol, this circuit
//! receives four encrypted `EUint64` ciphertexts representing:
//! - The Maker's minimum acceptable price
//! - The Maker's required exact asset size
//! - The Taker's offered price
//! - The Taker's offered asset size
//!
//! The circuit evaluates two conditions **entirely within the encrypted domain**:
//! 1. `bid_size == rfq_size`  — exact fill requirement (no partial fills in MVP)
//! 2. `bid_price >= rfq_price` — price sufficiency check
//!
//! The Encrypt executor nodes run this graph **without ever seeing the plaintext
//! values**. The output (a single `EUint64` of value 1 or 0) is then passed through
//! the Encrypt threshold decryptor network to reveal **only** the boolean result.
//!
//! ## Precision & Types
//!
//! Per the specification: ALL values MUST be 64-bit unsigned integers.
//! - Prices are denominated in USDC micro-cents (1 USDC = 1_000_000 units)
//! - Sizes are denominated in satoshis (1 BTC = 100_000_000 sats)
//! - **Floating-point arithmetic is explicitly forbidden** inside this circuit.
//!
//! ## Pre-Alpha Disclaimer
//!
//! In the Encrypt pre-alpha environment, no real FHE is performed.
//! All ciphertexts store plaintext values on-chain. The `#[encrypt_fn]` macro
//! correctly compiles the circuit logic and generates the on-chain CPI trait,
//! but the cryptographic privacy guarantees are not active until mainnet.

// Bring the #[encrypt_fn] DSL attribute macro into scope.
// This macro compiles the annotated function into a computation-graph (DAG)
// and simultaneously generates a CPI extension trait (MatchRfqBidCpi)
// that is automatically implemented for all EncryptCpi types.
use encrypt_dsl::prelude::encrypt_fn;

// EUint64 is the FHE type representing an encrypted 64-bit unsigned integer.
// All arithmetic and comparison operations on EUint64 work homomorphically.
// use encrypt_types::encrypted::EUint64;

// ─────────────────────────────────────────────────────────────────────────────
// THE MATCHING CIRCUIT
// ─────────────────────────────────────────────────────────────────────────────

/// Homomorphically evaluates whether a Taker bid matches a Maker's RFQ.
///
/// # Inputs (all EUint64 ciphertexts — plaintext never exposed to nodes)
/// - `rfq_price`  Maker's minimum acceptable price (USDC micro-cents)
/// - `rfq_size`   Maker's required exact asset amount (satoshis)
/// - `bid_price`  Taker's offered price (USDC micro-cents)
/// - `bid_size`   Taker's offered asset amount (satoshis)
///
/// # Output
/// - `EUint64` with value `1` (match) or `0` (no match).
///
/// # How if/else Works in FHE
/// The `if` / `else` syntax compiles to a **Select (CMux)** gate. Both branches
/// are ALWAYS computed — FHE cannot branch on encrypted data. The selector
/// chooses the output without revealing which path was taken.
///
/// # Generated Artifacts
/// The `#[encrypt_fn]` macro generates two things from this function:
/// 1. `match_rfq_bid() -> Vec<u8>` — serialized computation graph bytes
///    (used in `request_fhe_match` to pass the circuit to Encrypt's CPI)
// Re-export the generated CPI trait if possible, but keep it private if needed.
// We provide a public wrapper function to bypass visibility issues.
use pinocchio::{AccountView, ProgramResult};
use encrypt_pinocchio::EncryptContext;

pub fn match_rfq_bid_cpi(
    ctx:             &EncryptContext,
    rfq_price_ct:    &AccountView,
    rfq_size_ct:     &AccountView,
    bid_price_ct:    &AccountView,
    bid_size_ct:     &AccountView,
    match_result_ct: &AccountView,
) -> ProgramResult {
    ctx.match_rfq_bid(rfq_price_ct, rfq_size_ct, bid_price_ct, bid_size_ct, match_result_ct)
}

#[encrypt_fn]
pub fn match_rfq_bid(
    rfq_price: EUint64, // Maker's sealed minimum: Taker must meet or beat this
    rfq_size:  EUint64, // Maker's sealed size: Taker must match EXACTLY
    bid_price: EUint64, // Taker's sealed offer price
    bid_size:  EUint64, // Taker's sealed offer size
) -> EUint64 {
    // ── Condition A: Exact size match ────────────────────────────────────────
    // FHE comparison on EUint64 returns EUint64 with value 0 or 1.
    // No partial fills are supported in the MVP — the Taker must fill exactly.
    let size_match = bid_size == rfq_size;

    // ── Condition B: Bid price is at or above the Maker's minimum ────────────
    // If bid_price >= rfq_price → EUint64(1), else EUint64(0).
    let price_match = bid_price >= rfq_price;

    // ── Combined result via FHE Select ───────────────────────────────────────
    // Logical AND: if size_match is 1, return price_match value; else return 0.
    // This compiles to: Select(size_match, price_match, constant(0))
    // The executor never learns whether either condition was true individually.
    if size_match { price_match } else { size_match }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use encrypt_dsl::prelude::{parse_graph, run_mock, FheType};

    // Helper: run the circuit with plaintext inputs via mock arithmetic.
    // In mock mode the graph is evaluated in plaintext — no actual FHE.
    fn evaluate(rfq_price: u64, rfq_size: u64, bid_price: u64, bid_size: u64) -> u64 {
        run_mock(
            match_rfq_bid,
            &[rfq_price, rfq_size, bid_price, bid_size],
            &[
                FheType::EUint64,
                FheType::EUint64,
                FheType::EUint64,
                FheType::EUint64,
            ],
        )[0] // single output
    }

    // ─── Positive cases ──────────────────────────────────────────────────────

    #[test]
    fn test_exact_match_returns_1() {
        // bid_price == rfq_price and bid_size == rfq_size → should match
        let result = evaluate(
            1_000_000, // rfq_price:  1.00 USDC
            100_000_000, // rfq_size: 1 BTC in sats
            1_000_000, // bid_price: exactly 1.00 USDC
            100_000_000, // bid_size: exactly 1 BTC
        );
        assert_eq!(result, 1, "Exact match should return 1");
    }

    #[test]
    fn test_bid_price_above_minimum_returns_1() {
        // bid_price > rfq_price means Taker is offering MORE — Maker benefits
        let result = evaluate(1_000_000, 100_000_000, 1_500_000, 100_000_000);
        assert_eq!(result, 1, "Higher bid price should still match");
    }

    // ─── Negative cases ──────────────────────────────────────────────────────

    #[test]
    fn test_bid_price_below_minimum_returns_0() {
        // bid_price < rfq_price → Taker not meeting Maker's floor
        let result = evaluate(1_000_000, 100_000_000, 500_000, 100_000_000);
        assert_eq!(result, 0, "Underprice bid should not match");
    }

    #[test]
    fn test_size_mismatch_returns_0() {
        // bid_size != rfq_size → no partial fill allowed in MVP
        let result = evaluate(1_000_000, 100_000_000, 1_000_000, 50_000_000);
        assert_eq!(result, 0, "Size mismatch should not match");
    }

    #[test]
    fn test_both_conditions_fail_returns_0() {
        let result = evaluate(1_000_000, 100_000_000, 500_000, 50_000_000);
        assert_eq!(result, 0, "Both conditions failing should not match");
    }

    // ─── Graph structure validation ──────────────────────────────────────────

    #[test]
    fn test_graph_has_correct_shape() {
        // Validate that the #[encrypt_fn] macro compiled the graph correctly.
        let graph_bytes = match_rfq_bid();
        let graph = parse_graph(&graph_bytes).expect("Graph should parse successfully");
        assert_eq!(
            graph.header().num_inputs(),
            4,
            "Circuit must have exactly 4 inputs: rfq_price, rfq_size, bid_price, bid_size"
        );
        assert_eq!(
            graph.header().num_outputs(),
            1,
            "Circuit must have exactly 1 output: match result (0 or 1)"
        );
    }

    #[test]
    fn test_graph_bytes_are_non_empty() {
        let graph_bytes = match_rfq_bid();
        assert!(
            !graph_bytes.is_empty(),
            "Graph bytes must not be empty — circuit compilation failed"
        );
    }
}
