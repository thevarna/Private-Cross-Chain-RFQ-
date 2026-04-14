"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const api_1 = require("./api");
// ─── Configuration ─────────────────────────────────────────────────────────────
const SOLANA_RPC = process.env.SOLANA_RPC ?? "https://api.devnet.solana.com";
const PROGRAM_ID_STR = process.env.PROGRAM_ID ?? "PRVrFQd3eBKaxK3TEvdA2FPLQiSfGjH7jYHMEsGhsXM";
const POLL_INTERVAL = parseInt(process.env.POLL_MS ?? "2000", 10);
const DB_PATH = process.env.DB_PATH ?? path_1.default.join(__dirname, "rfq.db");
const API_PORT = parseInt(process.env.PORT ?? "3001", 10);
// ─── State account discriminators (must match Rust constants) ──────────────────
const RFQ_DISCRIMINATOR = 1; // state.rs: pub const RFQ_DISCRIMINATOR: u8 = 1;
// ─── RfqState byte layout (must match state.rs) ────────────────────────────────
// offset  0:  discriminator (1)
// offset  1:  maker[32]
// offset 33:  dwallet_pubkey[32]
// offset 65:  rfq_price_ct[32]
// offset 97:  rfq_size_ct[32]
// offset 129: foreign_asset_chain(1)
// offset 130: status(1)
// offset 131: computing_start_slot[8] u64 LE
// offset 139: salt[32]
// offset 171: bump(1)
// total:  172 bytes
function parseRfqAccount(pubkey, data, createdAt) {
    if (data.length < 172)
        return null;
    if (data[0] !== RFQ_DISCRIMINATOR)
        return null;
    const maker = new web3_js_1.PublicKey(data.slice(1, 33)).toBase58();
    const chain = data[129];
    const status = data[130];
    return { rfq_pubkey: pubkey, maker_pubkey: maker, status, chain, created_at: createdAt };
}
// ─── SQLite setup ─────────────────────────────────────────────────────────────
function initDb(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS rfqs (
      rfq_pubkey    TEXT PRIMARY KEY,
      maker_pubkey  TEXT NOT NULL,
      status        INTEGER NOT NULL DEFAULT 0,
      chain         INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs (status);
  `);
}
// ─── Indexer poll loop ────────────────────────────────────────────────────────
async function poll(connection, programId, db) {
    try {
        const accounts = await connection.getProgramAccounts(programId, {
            // Filter: only accounts starting with discriminator byte = 1 (RfqState)
            filters: [
                { memcmp: { offset: 0, bytes: Buffer.from([RFQ_DISCRIMINATOR]).toString("base64") } },
                { dataSize: 172 },
            ],
        });
        const now = new Date().toISOString();
        const upsert = db.prepare(`
      INSERT INTO rfqs (rfq_pubkey, maker_pubkey, status, chain, created_at, updated_at)
      VALUES (@rfq_pubkey, @maker_pubkey, @status, @chain, @created_at, @updated_at)
      ON CONFLICT(rfq_pubkey) DO UPDATE SET
        status     = excluded.status,
        updated_at = excluded.updated_at
    `);
        const transaction = db.transaction((rows) => {
            for (const row of rows)
                upsert.run(row);
        });
        const rows = [];
        for (const { pubkey, account } of accounts) {
            const parsed = parseRfqAccount(pubkey.toBase58(), account.data, now);
            if (parsed) {
                rows.push({ ...parsed, updated_at: now });
            }
        }
        if (rows.length > 0) {
            transaction(rows);
            console.log(`[relayer] Indexed ${rows.length} RFQ accounts at slot N`);
        }
    }
    catch (err) {
        console.error("[relayer] Poll error:", err?.message ?? err);
    }
}
// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log("[relayer] Starting Private RFQ Relayer…");
    console.log(`[relayer] Tracking program: ${PROGRAM_ID_STR}`);
    console.log(`[relayer] RPC: ${SOLANA_RPC}`);
    const connection = new web3_js_1.Connection(SOLANA_RPC, "confirmed");
    const programId = new web3_js_1.PublicKey(PROGRAM_ID_STR);
    const db = new better_sqlite3_1.default(DB_PATH);
    initDb(db);
    (0, api_1.startApiServer)(db, API_PORT);
    // First poll immediately, then on interval
    await poll(connection, programId, db);
    setInterval(() => poll(connection, programId, db), POLL_INTERVAL);
}
main().catch((err) => {
    console.error("[relayer] Fatal:", err);
    process.exit(1);
});
