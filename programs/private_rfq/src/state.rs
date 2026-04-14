//! # Private Cross-Chain RFQ Desk — State Definitions
//!
//! This module defines the on-chain data layouts for the two primary state
//! PDAs managed by the `private_rfq` program:
//!
//! 1. [`RfqState`] — the Maker's encrypted order (price + size sealed as FHE ciphertexts)
//! 2. [`BidState`] — the Taker's counter-proposal with USDC escrow
//!
//! ─── CRITICAL ARCHITECTURAL NOTE ────────────────────────────────────────────
//!
//! Per the official Encrypt pre-alpha documentation, ciphertexts are NOT byte
//! blobs embedded inside a program's accounts. Instead, they are SEPARATE
//! Solana keypair accounts (98 bytes each) owned by the Encrypt program.
//! Each ciphertext account's PUBLIC KEY is its unique identifier.
//!
//! Therefore, this module stores 32-byte account pubkeys in RfqState/BidState
//! — NOT raw encrypted bytes. This is the correct on-chain architecture.
//!
//! ─── STATUS ENUM ─────────────────────────────────────────────────────────────
//!
//! RFQ lifecycle: Active → Computing → Matched → Settled
//!                         └→ Active (on no-match or timeout)    
//!
//! Bid lifecycle: Pending → Accepted | Rejected

/// Discriminator byte for RfqState accounts.
pub const RFQ_DISCRIMINATOR: u8 = 1;

/// Discriminator byte for BidState accounts.
pub const BID_DISCRIMINATOR: u8 = 2;

/// RFQ Status codes
pub mod rfq_status {
    /// RFQ is open and accepting bids.
    pub const ACTIVE: u8 = 0;
    /// A bid has been submitted; FHE computation in progress.
    pub const COMPUTING: u8 = 1;
    /// FHE returned a positive match; awaiting Ika MPC signature.
    pub const MATCHED: u8 = 2;
    /// Ika approved_message CPI has been called; full settlement complete.
    pub const SETTLED: u8 = 3;
    /// The RFQ was cancelled (manual or timeout).
    pub const CANCELLED: u8 = 4;
}

/// Bid Status codes
pub mod bid_status {
    /// Bid is submitted and awaiting FHE evaluation.
    pub const PENDING: u8 = 0;
    /// FHE matched this bid; USDC sent to Maker.
    pub const ACCEPTED: u8 = 1;
    /// FHE evaluated this bid as a non-match; USDC refunded to Taker.
    pub const REJECTED: u8 = 2;
}

/// Target foreign chain identifier.
pub mod chain_id {
    pub const BITCOIN: u8 = 0;
    pub const ETHEREUM: u8 = 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// RfqState — Maker's encrypted Request for Quote
// ─────────────────────────────────────────────────────────────────────────────

/// Layout of the `RfqState` PDA.
///
/// PDA Seeds: `[b"rfq", maker_pubkey(32), salt(32)]`
///
/// Total size: 172 bytes
///
/// ```text
/// Offset  Len   Field
/// ──────────────────────────────────────────────────────────────────────
///      0    1   discriminator         = RFQ_DISCRIMINATOR (1)
///      1   32   maker                 Maker's Solana wallet public key
///     33   32   dwallet_pubkey        Ika dWallet account PDA public key
///     65   32   rfq_price_ct          Pubkey of Encrypt ciphertext acct (EUint64 price)
///     97   32   rfq_size_ct           Pubkey of Encrypt ciphertext acct (EUint64 size)
///    129    1   foreign_asset_chain   Chain selector: 0=BTC, 1=ETH
///    130    1   status                Current RFQ lifecycle status
///    131    8   computing_start_slot  Slot when Computing state began (timeout guard)
///    139   32   salt                  Randomised PDA derivation salt
///    171    1   bump                  PDA canonical bump seed
/// ──────────────────────────────────────────────────────────────────────
/// TOTAL: 172 bytes
/// ```
#[repr(C)]
pub struct RfqState {
    pub discriminator:        u8,
    pub maker:                [u8; 32],
    pub dwallet_pubkey:       [u8; 32],
    pub rfq_price_ct:         [u8; 32], // Encrypt ciphertext account pubkey
    pub rfq_size_ct:          [u8; 32], // Encrypt ciphertext account pubkey
    pub foreign_asset_chain:  u8,
    pub status:               u8,
    pub computing_start_slot: [u8; 8],  // u64 LE
    pub salt:                 [u8; 32],
    pub bump:                 u8,
}

impl RfqState {
    /// Total byte length of the account data.
    pub const LEN: usize = core::mem::size_of::<Self>();

    /// Deserialize from raw account bytes (read-only).
    pub fn from_bytes(data: &[u8]) -> Result<&Self, pinocchio::error::ProgramError> {
        use pinocchio::error::ProgramError;
        if data.len() < Self::LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        if data[0] != RFQ_DISCRIMINATOR {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(unsafe { &*(data.as_ptr() as *const Self) })
    }

    /// Deserialize from raw account bytes (mutable).
    pub fn from_bytes_mut(data: &mut [u8]) -> Result<&mut Self, pinocchio::error::ProgramError> {
        use pinocchio::error::ProgramError;
        if data.len() < Self::LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(unsafe { &mut *(data.as_mut_ptr() as *mut Self) })
    }

    pub fn computing_start_slot(&self) -> u64 {
        u64::from_le_bytes(self.computing_start_slot)
    }

    pub fn set_computing_start_slot(&mut self, slot: u64) {
        self.computing_start_slot = slot.to_le_bytes();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BidState — Taker's encrypted counter-proposal
// ─────────────────────────────────────────────────────────────────────────────

/// Layout of the `BidState` PDA.
///
/// PDA Seeds: `[b"bid", rfq_pda(32), taker_pubkey(32)]`
///
/// Total size: 298 bytes
///
/// ```text
/// Offset  Len   Field
/// ──────────────────────────────────────────────────────────────────────
///      0    1   discriminator         = BID_DISCRIMINATOR (2)
///      1   32   rfq_pda               Pubkey of the target RfqState account
///     33   32   taker                 Taker's Solana wallet public key
///     65   32   bid_price_ct          Pubkey of Encrypt ciphertext acct (EUint64 bid price)
///     97   32   bid_size_ct           Pubkey of Encrypt ciphertext acct (EUint64 bid size)
///    129   32   match_result_ct       Pubkey of Encrypt output ciphertext (EUint64 result)
///    161   32   decryption_request    Pubkey of Encrypt DecryptionRequest account
///    193   32   pending_digest        Ciphertext digest stored at request_decryption time
///    225    8   escrow_amount         USDC lamports locked in the vault
///    233   64   foreign_receive_addr  Destination address on foreign chain (UTF-8, padded)
///    297    1   status                Bid lifecycle status
///    298    1   bump                  PDA canonical bump seed
/// ──────────────────────────────────────────────────────────────────────
/// TOTAL: 299 bytes
/// ```
#[repr(C)]
pub struct BidState {
    pub discriminator:        u8,
    pub rfq_pda:              [u8; 32],
    pub taker:                [u8; 32],
    pub bid_price_ct:         [u8; 32], // Encrypt ciphertext account pubkey
    pub bid_size_ct:          [u8; 32], // Encrypt ciphertext account pubkey
    pub match_result_ct:      [u8; 32], // Encrypt output ciphertext pubkey
    pub decryption_request:   [u8; 32], // Encrypt DecryptionRequest account pubkey
    pub pending_digest:       [u8; 32], // Stored at request_decryption time
    pub escrow_amount:        [u8; 8],  // u64 LE
    pub foreign_receive_addr: [u8; 64], // BTC/ETH address, null-padded
    pub status:               u8,
    pub bump:                 u8,
}

impl BidState {
    pub const LEN: usize = core::mem::size_of::<Self>();

    pub fn from_bytes(data: &[u8]) -> Result<&Self, pinocchio::error::ProgramError> {
        use pinocchio::error::ProgramError;
        if data.len() < Self::LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        if data[0] != BID_DISCRIMINATOR {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(unsafe { &*(data.as_ptr() as *const Self) })
    }

    pub fn from_bytes_mut(data: &mut [u8]) -> Result<&mut Self, pinocchio::error::ProgramError> {
        use pinocchio::error::ProgramError;
        if data.len() < Self::LEN {
            return Err(ProgramError::InvalidAccountData);
        }
        Ok(unsafe { &mut *(data.as_mut_ptr() as *mut Self) })
    }

    pub fn escrow_amount(&self) -> u64 {
        u64::from_le_bytes(self.escrow_amount)
    }

    pub fn set_escrow_amount(&mut self, val: u64) {
        self.escrow_amount = val.to_le_bytes();
    }
}

// Ensure compile-time layout correctness
#[cfg(test)]
mod layout_tests {
    use super::*;

    #[test]
    fn rfq_state_layout() {
        // Expected: 1+32+32+32+32+1+1+8+32+1 = 172
        assert_eq!(RfqState::LEN, 172, "RfqState size mismatch");
    }

    #[test]
    fn bid_state_layout() {
        // Expected: 1+32+32+32+32+32+32+32+8+64+1+1 = 299
        assert_eq!(BidState::LEN, 299, "BidState size mismatch");
    }
}
