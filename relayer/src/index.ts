/**
 * Private RFQ Relayer — Solana Indexer + REST API (In-Memory Version)
 *
 * This version uses a high-performance in-memory store to avoid native 
 * binary dependencies (SQLite), ensuring absolute portability for the demo.
 */

import { Connection, PublicKey, GetProgramAccountsFilter } from "@solana/web3.js";
import bs58 from "bs58";
import { startApiServer } from "./api";

// ─── Configuration ─────────────────────────────────────────────────────────────

const SOLANA_RPC      = process.env.SOLANA_RPC      ?? "https://api.devnet.solana.com";
const PROGRAM_ID_STR  = process.env.PROGRAM_ID      ?? "HGvkqjJZXQbRPkPiMPxpKW153ssyoeqrbS19zgbAoRYp";
const POLL_INTERVAL   = parseInt(process.env.POLL_MS ?? "10000", 10);
const API_PORT        = parseInt(process.env.PORT    ?? "3001", 10);

const RFQ_DISCRIMINATOR = 1;

// ─── In-Memory Store ──────────────────────────────────────────────────────────

export interface RfqRecord {
  rfq_pubkey: string;
  maker_pubkey: string;
  status: number;
  chain: number;
  created_at: string;
  updated_at: string;
}

// Simple in-memory map for fast lookups and orderbook tracking
export const rfqStore = new Map<string, RfqRecord>();
const ignoredAccounts = new Set<string>();
let isFirstPoll = true;

// Seed the desk with realistic-looking dummy data for the presentation
function seedDemoData() {
  const seedRfqs: RfqRecord[] = [
    {
      rfq_pubkey: "RFQ8xYvKjL...Demo1",
      maker_pubkey: "Maker1...",
      status: 1, // ACTIVE
      chain: 1,  // BITCOIN
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      rfq_pubkey: "RFQ9zPwMjN...Demo2",
      maker_pubkey: "Maker2...",
      status: 3, // SETTLED
      chain: 1,  // BITCOIN
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    }
  ];
  
  seedRfqs.forEach(rfq => rfqStore.set(rfq.rfq_pubkey, rfq));
  console.log(`[relayer] Seeded ${seedRfqs.length} presentation RFQs.`);
}

function parseRfqAccount(pubkey: string, data: Buffer, createdAt: string): RfqRecord | null {
  if (data.length < 172) return null;
  if (data[0] !== RFQ_DISCRIMINATOR) return null;

  const maker  = new PublicKey(data.slice(1, 33)).toBase58();
  const chain  = data[129];
  const status = data[130];

  return { 
    rfq_pubkey: pubkey, 
    maker_pubkey: maker, 
    status, 
    chain, 
    created_at: createdAt,
    updated_at: createdAt
  };
}

// ─── Indexer poll loop ────────────────────────────────────────────────────────

async function poll(connection: Connection, programId: PublicKey) {
  try {
    if (isFirstPoll) {
      seedDemoData();
    }

    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        { memcmp: { offset: 0, bytes: bs58.encode(Buffer.from([RFQ_DISCRIMINATOR])) } },
        { dataSize: 172 },
      ] as GetProgramAccountsFilter[],
    });

    if (isFirstPoll) {
      accounts.forEach(a => ignoredAccounts.add(a.pubkey.toBase58()));
      console.log(`[relayer] Ignoring ${ignoredAccounts.size} historical RFQs for clean demo slate.`);
      isFirstPoll = false;
      return;
    }

    const now = new Date().toISOString();
    let updatedCount = 0;

    accounts.forEach(({ pubkey, account }) => {
      const pubkeyStr = pubkey.toBase58();
      if (ignoredAccounts.has(pubkeyStr)) return;

      const parsed = parseRfqAccount(pubkeyStr, account.data as Buffer, now);
      
      if (parsed) {
        const existing = rfqStore.get(pubkeyStr);
        if (!existing || existing.status !== parsed.status) {
          // Keep original created_at if updating
          const record = {
            ...parsed,
            created_at: existing ? existing.created_at : now
          };
          rfqStore.set(pubkeyStr, record);
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      console.log(`[relayer] Sync complete. Store size: ${rfqStore.size} (Updated ${updatedCount})`);
    }
  } catch (err: any) {
    console.error("[relayer] Poll error:", err?.message ?? err);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[relayer] Starting Private RFQ Relayer (In-Memory Mode)…");
  console.log(`[relayer] Tracking program: ${PROGRAM_ID_STR}`);
  console.log(`[relayer] RPC: ${SOLANA_RPC}`);

  const connection = new Connection(SOLANA_RPC, "confirmed");
  const programId  = new PublicKey(PROGRAM_ID_STR);

  // Start the API server with the shared store
  startApiServer(API_PORT);

  // Initial deep poll to populate memory
  await poll(connection, programId);
  
  // Continuous tracking
  setInterval(() => poll(connection, programId), POLL_INTERVAL);
}

main().catch((err) => {
  console.error("[relayer] Fatal Error:", err);
  process.exit(1);
});
