/**
 * Private RFQ Relayer — Solana Indexer + REST API
 *
 * This service:
 * 1. Polls Solana Devnet every 2s for all accounts owned by the private_rfq program
 * 2. Parses RfqState accounts (discriminator byte = 1)
 * 3. Upserts to a local SQLite database
 * 4. Serves a JSON REST API consumed by the Next.js frontend
 *
 * Important Privacy Note:
 * The relayer only indexes PUBLIC on-chain data — RFQ pubkeys, maker pubkeys,
 * and status codes. It NEVER stores or serves price/size ciphertext contents.
 */
export {};
