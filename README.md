# 🔐 Private Cross-Chain RFQ Desk

> **Encrypt × Ika Frontier Hackathon Submission**  
> A confidential, cross-chain OTC trading desk where order parameters are mathematically sealed throughout the entire lifecycle — from creation to settlement.

---

## 🚨 The Problem

Institutional and large-scale OTC crypto traders face a fundamental dilemma: **any on-chain trade reveals intent before execution**. This creates:

- **Front-running** — MEV bots read pending transactions and trade ahead, moving the market against the initiator.
- **Market impact** — Large order sizes become publicly visible the moment a quote is requested, letting counterparties reprice.
- **Privacy loss** — Makers reveal their exact floor price and Takers reveal their willingness-to-pay, destroying negotiation leverage.

Existing DEXes, AMMs, and even most OTC desks operate on fully-transparent on-chain state — there is no cryptographic mechanism to keep order parameters confidential while still allowing trustless, atomic settlement.

---

## 💡 The Solution

**Private RFQ Desk** is a sealed-bid, cross-chain Request-for-Quote protocol built on **Solana**, using:

- **[Encrypt](https://encrypt.xyz/) FHE (Fully Homomorphic Encryption)** to match orders on encrypted ciphertexts — neither the network, the validators, nor the counterparty ever sees price or size until *after* settlement is decided.
- **[Ika](https://ika.xyz/) 2PC-MPC** to authorize the release of native cross-chain assets (e.g., BTC on Bitcoin mainnet) without bridges, wrapped tokens, or custodians.

### Target Users

| Role | Use Case |
|------|----------|
| **Market Makers** | Quote BTC/USDC without revealing floor prices to the market |
| **Institutional Takers** | Fill large OTC blocks without market impact or front-running risk |
| **Cross-chain Traders** | Swap native BTC for Solana USDC in a single, atomic, trustless flow |

---

## 🏗️ How It Utilizes Encrypt & Ika

### Encrypt FHE — Confidential Order Matching

The Encrypt network provides the **FHE computation layer**. In this protocol:

1. **Maker** creates an RFQ by encrypting their `minPrice` and `assetSize` as FHE ciphertexts via the Encrypt gRPC API. The Solana program stores only the *ciphertext account public keys* — the plaintext never touches the chain.
2. **Taker** submits a sealed bid the same way — their `bidPrice` and `bidSize` are FHE ciphertexts.
3. The **Encrypt FHE graph** (`match_rfq_bid` circuit) performs a **ciphertext-to-ciphertext comparison** (`CT + CT`) using Encrypt's A-Star runtime. The result is a single encrypted boolean: `matched`.
4. The Encrypt **Threshold Decryptor** network decrypts only the match result boolean — the actual price and size values are *never* decrypted or revealed.

```
Maker Price [ENCRYPTED] ──┐
Maker Size  [ENCRYPTED] ──┤   Encrypt FHE Graph     → Encrypted Boolean (match/no-match)
Taker Price [ENCRYPTED] ──┤   (match_rfq_bid)        → Threshold Decryptor → Reveal on Solana
Taker Size  [ENCRYPTED] ──┘
```

> **Note:** For this hackathon demo on Devnet, the Encrypt gRPC SDK is mocked with deterministic keypair accounts. The FHE circuit logic, graph execution, and threshold decryption flow are fully scaffolded and ready for production SDK integration.

### Ika 2PC-MPC — Bridgeless Cross-Chain Settlement

The Ika network provides the **cross-chain signing layer**. When a match is confirmed:

1. The Maker pre-registers an **Ika dWallet** — a distributed key share that holds their BTC on the Bitcoin network (no bridge, no wrapping).
2. Upon `reveal_match`, the Solana program emits a settlement event to the Ika dWallet network.
3. The Ika **2PC-MPC cluster** (8 nodes) generates a Bitcoin transaction signature without any single node holding the full private key.
4. The BTC is released to the Taker's receive address. Simultaneously, USDC escrow is transferred to the Maker on Solana.

> **Note:** For this hackathon demo on Devnet, Ika SDK calls are simulated. The dWallet account, MPC signing round, and cross-chain message approval flows are fully scaffolded.

---

## 📋 Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                       │
│  Landing Page → Trade Desk → Create RFQ → RFQ Details Page   │
└───────────────────────────┬──────────────────────────────────┘
                            │  Solana Wallet Adapter
                            ▼
┌──────────────────────────────────────────────────────────────┐
│           Solana Program: private_rfq                         │
│  initialize_rfq → submit_bid → request_fhe_match             │
│  request_match_decrypt → reveal_match → execute_settlement   │
└─────────────┬──────────────────────┬─────────────────────────┘
              │                      │
              ▼                      ▼
┌─────────────────────┐   ┌──────────────────────────────┐
│  Encrypt FHE Layer   │   │      Ika 2PC-MPC Layer        │
│  match_rfq_bid       │   │  dWallet signature generation │
│  (CT + CT matching) │   │  Cross-chain BTC release      │
└─────────────────────┘   └──────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────┐
│         Relayer / Indexer (Node.js)                           │
│  Polls Solana for RFQ state changes → REST API (port 3001)   │
│  Powers the Live RFQ Orderbook in the frontend               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Build, Test & Run

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 22 |
| Rust | stable |
| Solana CLI | >= 1.18 |
| Anchor CLI | >= 0.30 |
| pnpm / npm | any |

### 1. Install Dependencies

```bash
# Clone the repository
git clone <repo-url>
cd "Private Cross-Chain RFQ"

# Install all npm workspace dependencies
npm install
```

### 2. Build the Solana Program

```bash
# Build the native Rust/SBF program
npm run build:program

# (Optional) Deploy to Devnet — requires funded wallet at ~/.config/solana/id.json
npm run deploy:devnet
```

### 3. Run the Frontend

```bash
# Start the Next.js dev server (port 3000)
npm run dev:app
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Run the Relayer (Required for Live Orderbook)

In a separate terminal:

```bash
# Start the Solana indexer + REST API (port 3001)
npm run dev:relayer
```

The Relayer polls Solana Devnet for program account changes and exposes them via a REST API at `http://localhost:3001/api/rfqs/active`.

### 5. Run Integration Tests

```bash
npm run test:integration
```

---

## 🔄 Demo Walkthrough

### Maker Flow (Seller)

1. Connect your Solana Devnet wallet (e.g., Phantom).
2. Click **"Enter Live Desk"** → **"Create New RFQ"**.
3. Enter `Asset Amount` (BTC), `Minimum Price` (USDC/BTC), and your **Ika dWallet Address**.
4. Click **"Encrypt & Publish RFQ"**. The app encrypts your parameters client-side and calls `initialize_rfq` on Solana.
5. Your sealed order appears in the **Live RFQ Desk** (only the RFQ ID, chain, and status are public — price and size remain hidden).

### Taker Flow (Buyer)

1. Connect a *second* Solana Devnet wallet.
2. Navigate to the **Live Desk** and click **"Place Bid"** on an active order.
3. Enter your `Bid Price` and `Bid Size`, plus your BTC receive address.
4. Click **"Encrypt & Submit Bid"**. The lifecycle runs automatically:
   - `submit_bid` — USDC escrow locked on Solana.
   - `request_fhe_match` — Encrypt graph triggered.
   - `request_match_decrypt` — Threshold decryptor reveals match result.
   - `reveal_match` — Match decision committed to Solana.
   - `Ika 2PC-MPC Signing` — Cross-chain authorization generated.
   - **Settlement Complete** — Assets released / escrow refunded.

---

## 📡 Deployed Program IDs

| Network | Program | ID |
|---------|---------|-----|
| Solana **Devnet** | `private_rfq` | `PRVrFQd3eBKaxK3TEvdA2FPLQiSfGjH7jYHMEsGhsXM` |
| Solana **Devnet** | `private_rfq` (active relayer tracking) | `HGvkqjJZXQbRPkPiMPxpKW153ssyoeqrbS19zgbAoRYp` |

> **Solana Explorer:** [View on Explorer ↗](https://explorer.solana.com/address/HGvkqjJZXQbRPkPiMPxpKW153ssyoeqrbS19zgbAoRYp?cluster=devnet)

---

## 📁 Repository Structure

```
.
├── app/                    # Next.js 14 frontend (App Router)
│   └── src/
│       ├── app/            # Pages: /, /trade, /trade/create, /trade/[rfqId]
│       ├── components/     # OrderBook, RfqCreationForm, BidSubmissionModal, etc.
│       ├── hooks/          # useRfqProgram.ts — Solana program interactions
│       └── stores/         # Zustand state (rfqStore)
├── programs/
│   └── private_rfq/        # Rust/Anchor Solana program
│       └── src/instructions/
│           ├── initialize_rfq.rs
│           ├── submit_bid.rs
│           ├── request_fhe_match.rs
│           ├── request_match_decrypt.rs
│           └── reveal_match.rs
├── relayer/                # Node.js Solana indexer + Express REST API
│   └── src/
│       ├── index.ts        # Polling loop + in-memory store
│       └── api.ts          # REST endpoints (/api/rfqs/active, etc.)
├── tests/                  # Integration tests (Mocha + Chai)
├── scripts/                # e2e-demo.ts — scripted end-to-end demo flow
└── Anchor.toml             # Anchor workspace config
```

---

## ⚠️ Hackathon Disclaimer

This project was built for the **Encrypt × Ika Frontier Hackathon** on Solana Devnet. The following are mocked for demo purposes:

- **Encrypt gRPC SDK**: FHE ciphertext accounts are generated as random Solana keypairs. In production, each would be the result of a verified `createInput` call to the Encrypt network.
- **Ika SDK**: dWallet creation, MPC signing rounds, and cross-chain message approvals are simulated with mock delays. The full 2PC-MPC protocol is scaffolded but requires a live Ika Devnet cluster.
- **USDC Escrow**: The escrow logic in `submit_bid` and `reveal_match` uses simplified account structures. A production implementation would integrate SPL Token vaults.

The core architecture, state machine, and FHE/MPC integration patterns are production-ready and designed to be swapped with live SDKs as they become available.

---

## 📜 License

MIT © 2026 — Built with ❤️ for the Encrypt × Ika Frontier Hackathon.
