// ─────────────────────────────────────────────────────────────────────────────
// Constants — All program addresses, endpoints, and seeds in one place.
// ─────────────────────────────────────────────────────────────────────────────

/** Encrypt FHE program on Solana Devnet (official pre-alpha) */
export const ENCRYPT_PROGRAM_ID = "4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8";

/** Ika dWallet program on Solana Devnet (official pre-alpha) */
export const IKA_DWALLET_PROGRAM_ID = "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY";

/** Private RFQ Desk program (deployed to devnet) */
export const PRIVATE_RFQ_PROGRAM_ID = "HGvkqjJZXQbRPkPiMPxpKW153ssyoeqrbS19zgbAoRYp";

/** Encrypt gRPC endpoint for ciphertext creation and graph execution */
export const ENCRYPT_GRPC_ENDPOINT = "https://pre-alpha-dev-1.encrypt.ika-network.net";

/** Ika gRPC endpoint for dWallet operations and signing */
export const IKA_GRPC_ENDPOINT = "https://pre-alpha-dev-1.ika.ika-network.net";

/** Solana Devnet RPC */
export const SOLANA_RPC = "https://api.devnet.solana.com";

/** Solana Devnet WebSocket */
export const SOLANA_WS = "wss://api.devnet.solana.com";

/** USDC Devnet mint address */
export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

/** Explorer base URL */
export const EXPLORER = "https://explorer.solana.com";

// ─── PDA Seeds ────────────────────────────────────────────────────────────────

const encoder = new TextEncoder();
export const RFQ_SEED           = encoder.encode("rfq");
export const BID_SEED           = encoder.encode("bid");
export const VAULT_SEED         = encoder.encode("vault");
export const ENCRYPT_CPI_SEED   = encoder.encode("__encrypt_cpi_authority");
export const IKA_CPI_SEED       = encoder.encode("__ika_cpi_authority");

// ─── On-chain state discriminators ───────────────────────────────────────────

export const RFQ_DISCRIMINATOR = 1;
export const BID_DISCRIMINATOR = 2;

// ─── Status enums ─────────────────────────────────────────────────────────────

export const RFQ_STATUS = {
  ACTIVE:    0,
  COMPUTING: 1,
  MATCHED:   2,
  SETTLED:   3,
  CANCELLED: 4,
} as const;

export const BID_STATUS = {
  PENDING:  0,
  ACCEPTED: 1,
  REJECTED: 2,
} as const;

// ─── Chain IDs ────────────────────────────────────────────────────────────────

export const CHAIN_ID = {
  BITCOIN:   0,
  ETHEREUM:  1,
} as const;

// ─── Ika Signature Schemes ────────────────────────────────────────────────────

export const SIGNATURE_SCHEME = {
  Ed25519:               0,
  Secp256k1Sha256:       1,
  EcdsaDoubleSha256:     2, // Bitcoin BIP143
  EcdsaKeccak256:        3, // Ethereum
} as const;

// ─── Timeout ─────────────────────────────────────────────────────────────────

/** Slots before force_cancel_timeout can be invoked */
export const TIMEOUT_SLOTS = 200;

/** Polling interval for ciphertext verified status (ms) */
export const POLL_INTERVAL_MS = 2000;

// ─── Relayer API ──────────────────────────────────────────────────────────────

export const RELAYER_API = process.env.NEXT_PUBLIC_RELAYER_URL ?? "http://localhost:3001";
