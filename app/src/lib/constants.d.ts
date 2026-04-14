/** Encrypt FHE program on Solana Devnet (official pre-alpha) */
export declare const ENCRYPT_PROGRAM_ID = "4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8";
/** Ika dWallet program on Solana Devnet (official pre-alpha) */
export declare const IKA_DWALLET_PROGRAM_ID = "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY";
/** Private RFQ Desk program (deployed to devnet) */
export declare const PRIVATE_RFQ_PROGRAM_ID = "PRVrFQd3eBKaxK3TEvdA2FPLQiSfGjH7jYHMEsGhsXM";
/** Encrypt gRPC endpoint for ciphertext creation and graph execution */
export declare const ENCRYPT_GRPC_ENDPOINT = "https://pre-alpha-dev-1.encrypt.ika-network.net";
/** Ika gRPC endpoint for dWallet operations and signing */
export declare const IKA_GRPC_ENDPOINT = "https://pre-alpha-dev-1.ika.ika-network.net";
/** Solana Devnet RPC */
export declare const SOLANA_RPC = "https://api.devnet.solana.com";
/** Solana Devnet WebSocket */
export declare const SOLANA_WS = "wss://api.devnet.solana.com";
/** USDC Devnet mint address */
export declare const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
/** Explorer base URL */
export declare const EXPLORER = "https://explorer.solana.com";
export declare const RFQ_SEED: Uint8Array<ArrayBuffer>;
export declare const BID_SEED: Uint8Array<ArrayBuffer>;
export declare const VAULT_SEED: Uint8Array<ArrayBuffer>;
export declare const ENCRYPT_CPI_SEED: Uint8Array<ArrayBuffer>;
export declare const IKA_CPI_SEED: Uint8Array<ArrayBuffer>;
export declare const RFQ_DISCRIMINATOR = 1;
export declare const BID_DISCRIMINATOR = 2;
export declare const RFQ_STATUS: {
    readonly ACTIVE: 0;
    readonly COMPUTING: 1;
    readonly MATCHED: 2;
    readonly SETTLED: 3;
    readonly CANCELLED: 4;
};
export declare const BID_STATUS: {
    readonly PENDING: 0;
    readonly ACCEPTED: 1;
    readonly REJECTED: 2;
};
export declare const CHAIN_ID: {
    readonly BITCOIN: 0;
    readonly ETHEREUM: 1;
};
export declare const SIGNATURE_SCHEME: {
    readonly Ed25519: 0;
    readonly Secp256k1Sha256: 1;
    readonly EcdsaDoubleSha256: 2;
    readonly EcdsaKeccak256: 3;
};
/** Slots before force_cancel_timeout can be invoked */
export declare const TIMEOUT_SLOTS = 200;
/** Polling interval for ciphertext verified status (ms) */
export declare const POLL_INTERVAL_MS = 2000;
export declare const RELAYER_API: string;
