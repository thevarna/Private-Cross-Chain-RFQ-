//! # Custom Error Codes for the Private RFQ Desk Program
//!
//! These error codes encode the precise failure conditions specific to the
//! RFQ lifecycle, FHE state management, and Ika settlement flow.
//!
//! Each error code is in the range 1000–1009. Pinocchio maps them to
//! `ProgramError::Custom(code)` via the `into()` conversion.

/// Error: A Taker attempted to bid on an RFQ that is not in Active status.
///
/// Trigger: `submit_bid` called on an RFQ with status != Active.
/// Mitigation: Frontend must poll RFQ status before allowing bid submission.
pub const ERR_RFQ_NOT_ACTIVE: u32 = 1000;

/// Error: An instruction requiring the Computing state was called on wrong state.
///
/// Trigger: `request_match_decryption` or `reveal_match` on non-Computing RFQ.
pub const ERR_MUST_BE_COMPUTING: u32 = 1001;

/// Error: The stored decryption digest does not match the request account.
///
/// Trigger: `reveal_match` — ciphertext was modified between request and reveal.
/// This is a security critical check per the Encrypt digest-verification pattern.
pub const ERR_DIGEST_MISMATCH: u32 = 1002;

/// Error: The Encrypt decryptor has not yet written the plaintext result.
///
/// Trigger: `reveal_match` — decryptor response is still pending.
/// Mitigation: Frontend should poll until DecryptionRequest account is complete.
pub const ERR_DECRYPTION_NOT_COMPLETE: u32 = 1003;

/// Error: `execute_settlement` was called on an RFQ that is not Matched.
///
/// Trigger: FHE returned 0 (no match), or settlement already happened.
pub const ERR_NOT_MATCHED: u32 = 1004;

/// Error: `force_cancel_timeout` called before 200 blocks have elapsed.
///
/// Trigger: Timeout instruction invoked too early (< 200 slots in Computing state).
pub const ERR_NOT_TIMED_OUT: u32 = 1005;

/// Error: Taker's escrowed USDC amount is insufficient for the bid.
///
/// Trigger: `submit_bid` — escrow_amount < expected minimum based on bid_size.
/// Mitigation: Client must recalculate and approve a larger token transfer.
pub const ERR_INVALID_ESCROW: u32 = 1006;

/// Error: The provided ciphertext account pubkey does not match the stored one.
///
/// Trigger: Mismatched account passed to instructions expecting specific ciphertexts.
pub const ERR_CIPHERTEXT_MISMATCH: u32 = 1007;

/// Error: Signer is not authorized for this operation.
///
/// Trigger: Non-maker calling execute_settlement, or non-party calling timeout.
pub const ERR_UNAUTHORIZED: u32 = 1008;

/// Error: The RFQ has already been settled or cancelled.
pub const ERR_RFQ_FINALIZED: u32 = 1009;

/// Helper: convert u32 error code to ProgramError
#[inline(always)]
pub fn custom_error(code: u32) -> pinocchio::error::ProgramError {
    pinocchio::error::ProgramError::Custom(code)
}
