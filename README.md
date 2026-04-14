# Private Cross-Chain RFQ Desk

> **Colosseum Frontier Hackathon 2026 — Track: Encrypt × Ika**
>
> *Privacy-preserving OTC trading: encrypted price discovery via REFHE + bridgeless settlement via 2PC-MPC dWallet*

---

## What Was Built

A production-architected, end-to-end **Private Request-for-Quote Desk** that enables institutional OTC traders to negotiate and settle cross-chain transactions without ever exposing their price or size to the counterparty or the public.

| Layer | Technology | Purpose |
|---|---|---|
| **Blockchain** | Solana Devnet (Pinocchio) | State machine, escrow, settlement proof |
| **Privacy** | Encrypt REFHE (FHE) | Encrypted order matching — price/size never revealed |
| **Cross-Chain** | Ika 2PC-MPC dWallet | Bridgeless BTC release via MPC signature |
| **Frontend** | Next.js 14 + Tailwind | Institutional dark-mode trading console |
| **Indexer** | Node.js + SQLite | Privacy-safe RFQ feed (pubkeys/status only) |

---

## Architecture Overview

```
Maker                             Taker
  │                                 │
  │  createInput(price_u64)         │  createInput(bid_price_u64)
  │  createInput(size_u64)          │  createInput(bid_size_u64)
  │     ── Encrypt gRPC ──          │     ── Encrypt gRPC ──
  │  [price_ct pubkey]              │  [bid_price_ct pubkey]
  │  [size_ct pubkey]               │  [bid_size_ct pubkey]
  │                                 │
  ├── initialize_rfq ───────────────►
  │     (stores ciphertext pubkeys) │
  │     (dWallet already loaded)    │
  │                                 ├── submit_bid ──────────────────────►
  │                                 │     (USDC escrowed in vault PDA)
  │                                 │
  │                                 ├── request_fhe_match ───────────────►
  │                                 │     (CPIs execute_graph to Encrypt)
  │                                 │     Encrypt executor evaluates:
  │                                 │       match_rfq_bid(p1,s1,p2,s2)→EUint64
  │                                 │
  │                                 ├── request_match_decrypt ───────────►
  │                                 │     (CPIs request_decryption)
  │                                 │     Decryptor reveals: 1 or 0
  │                                 │
  │                                 ├── reveal_match ────────────────────►
  │                                 │     1 → MATCH:  USDC → Maker
  │                                 │     0 → REJECT: USDC → Taker
  │                                 │
  ├── execute_settlement ──────────────────────────────────────────────────►
  │     (CPIs approve_message to Ika)
  │     Ika NOA 2PC-MPC signs the foreign-chain TX
  │     MessageApproval PDA: status → Signed
  │
  │  [polls MessageApproval PDA until status=1]
  │  [reads signature bytes]
  │  [broadcasts BTC transaction]
```

---

## Key Technical Decisions

### Framework: Pinocchio (Not Anchor)

The Encrypt SDK requires `anchor-lang = "0.32"` while the Ika SDK requires `anchor-lang = "1"`. These cannot coexist in one Cargo crate. Pinocchio is supported by **both** sponsor SDKs, avoids the version conflict, uses direct memory pointers for zero-overhead deserialization, and reduces CU usage.

### Ciphertext Storage Architecture

Per the official Encrypt documentation, ciphertexts are **separate 98-byte Solana keypair accounts** owned by the Encrypt program. This program stores their **32-byte account pubkeys** in `RfqState` and `BidState` — not raw encrypted bytes. The account pubkey IS the ciphertext identifier.

### FHE Circuit Output: EUint64 (0 or 1)

REFHE comparisons on `EUint64` return `EUint64` (value 0 or 1), not `EBool`. The circuit returns an `EUint64` and we check `value > 0` for a match in `reveal_match`.

### Async 4-Step FHE Lifecycle

```
request_fhe_match → [Encrypt executor, ~5-30s] → request_match_decrypt → [Decryptor, ~5-30s] → reveal_match
```

There is no synchronous callback from the Encrypt cluster. The frontend polls account status.

---

## Pre-Alpha Disclaimers

> ⚠️ **IMPORTANT — For Judges**: Both the Encrypt and Ika pre-alpha networks use **mock cryptography**:
>
> - **Encrypt REFHE**: No real FHE applied. Ciphertexts store plaintext values in pre-alpha.
> - **Ika dWallet**: No real 2PC-MPC. A single mock NOA keypair signs. Non-collusion not enforced.
>
> The **code architecture** is fully production-correct. Cryptographic guarantees activate at mainnet. Do not submit real funds.

---

## Program Addresses (Devnet)

| Contract | Address |
|---|---|
| `private_rfq` | `PRVrFQd3eBKaxK3TEvdA2FPLQiSfGjH7jYHMEsGhsXM` |
| Encrypt Program | `4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8` |
| Ika dWallet Program | `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY` |

---

## Build & Run

### Prerequisites

- Rust stable with `cargo build-sbf` (Solana CLI toolkit)
- Node.js ≥ 20
- Solana CLI configured for devnet
- Phantom or Solflare browser wallet with devnet SOL + USDC

### 1. Build the FHE Circuit and Program

```bash
# Clone & enter project
cd "Private Cross-Chain RFQ"

# Run FHE circuit tests
cargo test -p private-rfq-circuit --lib

# Build on-chain program (SBF)
cargo build-sbf -p private-rfq
```

### 2. Deploy

```bash
# Airdrop SOL (if needed)
solana airdrop 2 --url devnet

# Deploy program
solana program deploy target/deploy/private_rfq.so --url devnet
```

### 3. Run the Relayer

```bash
cd relayer
npm install
npm run dev
# → Listening on http://localhost:3001
```

### 4. Run the Frontend

```bash
cd app
npm install
npm run dev
# → Open http://localhost:3000
```

### 5. Run Tests

```bash
# Integration tests (no validator required)
npm run test:integration
```

---

## File Structure

```
private-rfq-desk/
├── encrypt-circuit/           FHE computation graph (#[encrypt_fn])
│   ├── Cargo.toml
│   └── src/lib.rs             match_rfq_bid circuit + 7 unit tests
│
├── programs/private_rfq/      On-chain Pinocchio program
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs             Entrypoint + 7-instruction dispatcher
│       ├── state.rs           RfqState (172B) + BidState (299B) layouts
│       ├── errors.rs          10 custom error codes
│       └── instructions/
│           ├── initialize_rfq.rs       [0] Maker publishes encrypted RFQ
│           ├── submit_bid.rs           [1] Taker places bid + USDC escrow
│           ├── request_fhe_match.rs    [2] CPI: Encrypt execute_graph
│           ├── request_match_decrypt.rs[3] CPI: Encrypt request_decryption
│           ├── reveal_match.rs         [4] USDC settle or refund
│           ├── execute_settlement.rs   [5] CPI: Ika approve_message
│           └── force_cancel_timeout.rs [6] Emergency timeout reset
│
├── app/                       Next.js 14 frontend
│   └── src/
│       ├── app/               Layout + main page (3-column console)
│       ├── components/
│       │   ├── StatusStepper.tsx       8-step lifecycle visualizer
│       │   ├── RfqCreationForm.tsx     Maker flow
│       │   ├── BidSubmissionModal.tsx  Taker flow
│       │   ├── OrderBook.tsx           Live RFQ feed
│       │   └── SettlementDashboard.tsx Post-trade proof of privacy
│       ├── hooks/             useRfqProgram, useEncrypt, useIka
│       ├── stores/            Zustand global state
│       └── lib/               Constants (program IDs, endpoints, seeds)
│
├── relayer/                   Node.js indexer + REST API
│   └── src/
│       ├── index.ts           Solana polling daemon → SQLite
│       └── api.ts             Express endpoints (/api/rfqs/active, etc.)
│
└── tests/                     Integration test suite (mocha + chai)
    └── private_rfq.ts
```

---

## Sponsor Integration Summary

### Encrypt (REFHE FHE)

- **`encrypt-circuit/src/lib.rs`** — `#[encrypt_fn] match_rfq_bid(...)` defines the 4-input, 1-output FHE graph
- **`request_fhe_match.rs`** — CPIs `execute_graph` via `EncryptContext.match_rfq_bid(...)`
- **`request_match_decrypt.rs`** — CPIs `request_decryption`, stores `pending_digest`
- **`reveal_match.rs`** — Calls `read_decrypted_verified::<Uint64>()` with digest check

### Ika (2PC-MPC dWallet)

- **`execute_settlement.rs`** — CPIs `approve_message` via `DWalletContext` after FHE match confirmed
- **`useIka.ts`** — Polls `MessageApproval` PDA until `status == 1`, reads signature bytes
- dWallet authority pre-transferred to `PDA([b"__ika_cpi_authority"], PROGRAM_ID)`

---

*Built for the Encrypt × Ika track of the Colosseum Frontier Hackathon, April 2026.*
*Zero trust. Zero exposure. Fully on-chain.*
