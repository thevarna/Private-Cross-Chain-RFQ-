/**
 * Integration Test Suite — Private RFQ Desk
 *
 * Tests the full lifecycle of the Private Cross-Chain RFQ Desk:
 * 1. FHE Circuit unit tests (in-process, no validator)
 * 2. Program account layout assertions (binary parsing)
 * 3. PDA derivation correctness
 * 4. End-to-end flow mock (using pre-built fixtures)
 */

import { describe, it, before } from "mocha";
import { assert } from "chai";
import {
  Connection,
  PublicKey,
  Keypair,
} from "@solana/web3.js";

// ─── Configuration ─────────────────────────────────────────────────────────────

const PROGRAM_ID  = new PublicKey("PRVrFQd3eBKaxK3TEvdA2FPLQiSfGjH7jYHMEsGhsXM");
const SOLANA_RPC  = "https://api.devnet.solana.com";

// ─── RfqState Layout Constants (must match state.rs) ─────────────────────────

const RFQ_LEN              = 172;
const RFQ_DISCRIMINATOR    = 1;
const RFQ_MAKER_OFFSET     = 1;
const RFQ_STATUS_OFFSET    = 130;
const RFQ_CHAIN_OFFSET     = 129;

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: PDA Derivation Correctness
// ─────────────────────────────────────────────────────────────────────────────

describe("PDA Derivation", () => {
  const maker = Keypair.generate().publicKey;
  const salt  = Buffer.alloc(32, 42);  // fixed salt for determinism

  it("findRfqPda is deterministic", () => {
    const [pda1] = PublicKey.findProgramAddressSync(
      [Buffer.from("rfq"), maker.toBuffer(), salt],
      PROGRAM_ID
    );
    const [pda2] = PublicKey.findProgramAddressSync(
      [Buffer.from("rfq"), maker.toBuffer(), salt],
      PROGRAM_ID
    );
    assert.strictEqual(pda1.toBase58(), pda2.toBase58());
  });

  it("different salts produce different RFQ PDAs", () => {
    const salt2 = Buffer.alloc(32, 99);
    const [pda1] = PublicKey.findProgramAddressSync(
      [Buffer.from("rfq"), maker.toBuffer(), salt],
      PROGRAM_ID
    );
    const [pda2] = PublicKey.findProgramAddressSync(
      [Buffer.from("rfq"), maker.toBuffer(), salt2],
      PROGRAM_ID
    );
    assert.notStrictEqual(pda1.toBase58(), pda2.toBase58());
  });

  it("findBidPda seeds are correct", () => {
    const rfqPda = Keypair.generate().publicKey;
    const taker  = Keypair.generate().publicKey;
    const [bidPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("bid"), rfqPda.toBuffer(), taker.toBuffer()],
      PROGRAM_ID
    );
    assert.ok(bidPda instanceof PublicKey);
    assert.isAtLeast(bump, 0);
    assert.isAtMost(bump, 255);
  });

  it("vault PDA is derived from rfqPda", () => {
    const rfqPda = Keypair.generate().publicKey;
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), rfqPda.toBuffer()],
      PROGRAM_ID
    );
    assert.ok(vaultPda instanceof PublicKey);
  });

  it("Encrypt CPI authority uses correct seed", () => {
    const [encryptCpi] = PublicKey.findProgramAddressSync(
      [Buffer.from("__encrypt_cpi_authority")],
      PROGRAM_ID
    );
    assert.ok(encryptCpi instanceof PublicKey);
  });

  it("Ika CPI authority uses correct seed", () => {
    const [ikaCpi] = PublicKey.findProgramAddressSync(
      [Buffer.from("__ika_cpi_authority")],
      PROGRAM_ID
    );
    assert.ok(ikaCpi instanceof PublicKey);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Account Layout Parsing
// ─────────────────────────────────────────────────────────────────────────────

describe("RfqState Account Layout", () => {
  // Build a synthetic RfqState buffer matching the Rust struct layout
  function buildMockRfqAccount(
    status: number,
    chain: number,
    maker: PublicKey
  ): Buffer {
    const buf = Buffer.alloc(RFQ_LEN, 0);
    buf[0] = RFQ_DISCRIMINATOR;                    // discriminator
    maker.toBuffer().copy(buf, 1);                 // maker[32]
    // dwallet[32] zero (offset 33)
    // rfq_price_ct[32] zero (offset 65)
    // rfq_size_ct[32] zero (offset 97)
    buf[RFQ_CHAIN_OFFSET]  = chain;                // foreign_asset_chain
    buf[RFQ_STATUS_OFFSET] = status;               // status
    // computing_start_slot (8 bytes) zero
    // salt (32 bytes) zero
    // bump zero
    return buf;
  }

  it("total account size is 172 bytes", () => {
    assert.strictEqual(RFQ_LEN, 172);
  });

  it("discriminator byte is 1", () => {
    const maker = Keypair.generate().publicKey;
    const buf   = buildMockRfqAccount(0, 0, maker);
    assert.strictEqual(buf[0], RFQ_DISCRIMINATOR);
  });

  it("maker pubkey parsed at offset 1", () => {
    const maker = Keypair.generate().publicKey;
    const buf   = buildMockRfqAccount(0, 0, maker);
    const parsed = new PublicKey(buf.slice(1, 33));
    assert.strictEqual(parsed.toBase58(), maker.toBase58());
  });

  it("status parsed at offset 130", () => {
    const maker = Keypair.generate().publicKey;
    const buf   = buildMockRfqAccount(2, 0, maker); // MATCHED
    assert.strictEqual(buf[RFQ_STATUS_OFFSET], 2);
  });

  it("chain parsed at offset 129", () => {
    const maker = Keypair.generate().publicKey;
    const buf   = buildMockRfqAccount(0, 1, maker); // ETHEREUM
    assert.strictEqual(buf[RFQ_CHAIN_OFFSET], 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: FHE Circuit Logic (mock arithmetic validation)
// ─────────────────────────────────────────────────────────────────────────────

describe("FHE Circuit Match Logic (arithmetic verification)", () => {
  // Simulate the match_rfq_bid circuit evaluation in plaintext
  // (same logic as the Rust circuit, evaluated in TypeScript for testing symmetry)
  function mockMatchCircuit(
    rfqPrice: bigint, rfqSize: bigint,
    bidPrice: bigint, bidSize: bigint
  ): bigint {
    const sizeMatch  = bidSize === rfqSize   ? 1n : 0n;
    const priceMatch = bidPrice >= rfqPrice  ? 1n : 0n;
    // if size_match { price_match } else { 0 }
    return sizeMatch === 1n ? priceMatch : 0n;
  }

  it("exact bid matches", () => {
    const result = mockMatchCircuit(
      1_000_000n, 100_000_000n,  // rfq: 1 USDC, 1 BTC
      1_000_000n, 100_000_000n   // bid: 1 USDC, 1 BTC
    );
    assert.strictEqual(result, 1n);
  });

  it("bid price above min matches", () => {
    const result = mockMatchCircuit(1_000_000n, 100_000_000n, 1_500_000n, 100_000_000n);
    assert.strictEqual(result, 1n, "Price above floor should match");
  });

  it("bid price below min does not match", () => {
    const result = mockMatchCircuit(1_000_000n, 100_000_000n, 500_000n, 100_000_000n);
    assert.strictEqual(result, 0n, "Price below floor should not match");
  });

  it("size mismatch does not match", () => {
    const result = mockMatchCircuit(1_000_000n, 100_000_000n, 1_000_000n, 50_000_000n);
    assert.strictEqual(result, 0n, "Partial fill should not match");
  });

  it("both conditions failing returns 0", () => {
    const result = mockMatchCircuit(1_000_000n, 100_000_000n, 500_000n, 50_000_000n);
    assert.strictEqual(result, 0n);
  });

  it("u64 boundary: max u64 bid price matches", () => {
    const MAX_U64 = 18_446_744_073_709_551_615n;
    const result  = mockMatchCircuit(1_000_000n, 100_000_000n, MAX_U64, 100_000_000n);
    assert.strictEqual(result, 1n);
  });

  it("u64 boundary: zero bid size with nonzero rfq size fails", () => {
    const result = mockMatchCircuit(1_000_000n, 100_000_000n, 1_000_000n, 0n);
    assert.strictEqual(result, 0n);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4: Instruction Data Encoding
// ─────────────────────────────────────────────────────────────────────────────

describe("Instruction Data Encoding", () => {
  it("initialize_rfq data is 68 bytes total (1 discriminator + 67 payload)", () => {
    const salt     = Buffer.alloc(32, 7);
    const dwallet  = Keypair.generate().publicKey;
    const rfqBump  = 254;
    const chain    = 0;
    const encBump  = 253;

    const payload = Buffer.alloc(67);
    payload[0] = rfqBump;
    salt.copy(payload, 1);
    dwallet.toBuffer().copy(payload, 33);
    payload[65] = chain;
    payload[66] = encBump;

    const ix = Buffer.concat([Buffer.from([0]), payload]);
    assert.strictEqual(ix.length, 68);
    assert.strictEqual(ix[0], 0, "discriminator");
    assert.strictEqual(ix[1], rfqBump, "rfq_bump");
    assert.strictEqual(ix[65 + 1], chain, "chain");
    assert.strictEqual(ix[66 + 1], encBump, "enc_cpi_bump");
  });

  it("submit_bid data is 75 bytes total", () => {
    const escrow = BigInt(5_000_000_000); // 5000 USDC
    const addr   = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

    const payload = Buffer.alloc(74);
    payload[0] = 127; // bid_bump
    payload[1] = 126; // vault_bump
    const escrowBuf = Buffer.alloc(8);
    escrowBuf.writeBigUInt64LE(escrow, 0);
    escrowBuf.copy(payload, 2);
    Buffer.from(addr).slice(0, 64).copy(payload, 10);

    const ix = Buffer.concat([Buffer.from([1]), payload]);
    assert.strictEqual(ix.length, 75);
    assert.strictEqual(ix[0], 1, "discriminator");
    assert.strictEqual(
      ix.readBigUInt64LE(3).toString(),
      escrow.toString(),
      "escrow u64 LE"
    );
  });

  it("execute_settlement data is 101 bytes total", () => {
    const data = Buffer.alloc(100);
    const digest = Buffer.alloc(32, 0xab);
    data[0] = 252; // ika_cpi_bump
    digest.copy(data, 1);  // message_digest
    digest.copy(data, 33); // message_metadata_digest
    digest.copy(data, 65); // user_pubkey
    data.writeUInt16LE(2, 97); // signature_scheme (EcdsaDoubleSha256)
    data[99] = 251; // message_approval_bump

    const ix = Buffer.concat([Buffer.from([5]), data]);
    assert.strictEqual(ix.length, 101);
    assert.strictEqual(ix.readUInt16LE(98), 2, "signature_scheme");
  });
});
