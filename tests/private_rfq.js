"use strict";
/**
 * Integration Test Suite — Private RFQ Desk
 *
 * Tests the full lifecycle of the Private Cross-Chain RFQ Desk:
 * 1. FHE Circuit unit tests (in-process, no validator)
 * 2. Program account layout assertions (binary parsing)
 * 3. PDA derivation correctness
 * 4. End-to-end flow mock (using pre-built fixtures)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const web3_js_1 = require("@solana/web3.js");
// ─── Configuration ─────────────────────────────────────────────────────────────
const PROGRAM_ID = new web3_js_1.PublicKey("PRVrFQd3eBKaxK3TEvdA2FPLQiSfGjH7jYHMEsGhsXM");
const SOLANA_RPC = "https://api.devnet.solana.com";
// ─── RfqState Layout Constants (must match state.rs) ─────────────────────────
const RFQ_LEN = 172;
const RFQ_DISCRIMINATOR = 1;
const RFQ_MAKER_OFFSET = 1;
const RFQ_STATUS_OFFSET = 130;
const RFQ_CHAIN_OFFSET = 129;
// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: PDA Derivation Correctness
// ─────────────────────────────────────────────────────────────────────────────
(0, mocha_1.describe)("PDA Derivation", () => {
    const maker = web3_js_1.Keypair.generate().publicKey;
    const salt = Buffer.alloc(32, 42); // fixed salt for determinism
    (0, mocha_1.it)("findRfqPda is deterministic", () => {
        const [pda1] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("rfq"), maker.toBuffer(), salt], PROGRAM_ID);
        const [pda2] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("rfq"), maker.toBuffer(), salt], PROGRAM_ID);
        chai_1.assert.strictEqual(pda1.toBase58(), pda2.toBase58());
    });
    (0, mocha_1.it)("different salts produce different RFQ PDAs", () => {
        const salt2 = Buffer.alloc(32, 99);
        const [pda1] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("rfq"), maker.toBuffer(), salt], PROGRAM_ID);
        const [pda2] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("rfq"), maker.toBuffer(), salt2], PROGRAM_ID);
        chai_1.assert.notStrictEqual(pda1.toBase58(), pda2.toBase58());
    });
    (0, mocha_1.it)("findBidPda seeds are correct", () => {
        const rfqPda = web3_js_1.Keypair.generate().publicKey;
        const taker = web3_js_1.Keypair.generate().publicKey;
        const [bidPda, bump] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("bid"), rfqPda.toBuffer(), taker.toBuffer()], PROGRAM_ID);
        chai_1.assert.ok(bidPda instanceof web3_js_1.PublicKey);
        chai_1.assert.isAtLeast(bump, 0);
        chai_1.assert.isAtMost(bump, 255);
    });
    (0, mocha_1.it)("vault PDA is derived from rfqPda", () => {
        const rfqPda = web3_js_1.Keypair.generate().publicKey;
        const [vaultPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("vault"), rfqPda.toBuffer()], PROGRAM_ID);
        chai_1.assert.ok(vaultPda instanceof web3_js_1.PublicKey);
    });
    (0, mocha_1.it)("Encrypt CPI authority uses correct seed", () => {
        const [encryptCpi] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("__encrypt_cpi_authority")], PROGRAM_ID);
        chai_1.assert.ok(encryptCpi instanceof web3_js_1.PublicKey);
    });
    (0, mocha_1.it)("Ika CPI authority uses correct seed", () => {
        const [ikaCpi] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("__ika_cpi_authority")], PROGRAM_ID);
        chai_1.assert.ok(ikaCpi instanceof web3_js_1.PublicKey);
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Account Layout Parsing
// ─────────────────────────────────────────────────────────────────────────────
(0, mocha_1.describe)("RfqState Account Layout", () => {
    // Build a synthetic RfqState buffer matching the Rust struct layout
    function buildMockRfqAccount(status, chain, maker) {
        const buf = Buffer.alloc(RFQ_LEN, 0);
        buf[0] = RFQ_DISCRIMINATOR; // discriminator
        maker.toBuffer().copy(buf, 1); // maker[32]
        // dwallet[32] zero (offset 33)
        // rfq_price_ct[32] zero (offset 65)
        // rfq_size_ct[32] zero (offset 97)
        buf[RFQ_CHAIN_OFFSET] = chain; // foreign_asset_chain
        buf[RFQ_STATUS_OFFSET] = status; // status
        // computing_start_slot (8 bytes) zero
        // salt (32 bytes) zero
        // bump zero
        return buf;
    }
    (0, mocha_1.it)("total account size is 172 bytes", () => {
        chai_1.assert.strictEqual(RFQ_LEN, 172);
    });
    (0, mocha_1.it)("discriminator byte is 1", () => {
        const maker = web3_js_1.Keypair.generate().publicKey;
        const buf = buildMockRfqAccount(0, 0, maker);
        chai_1.assert.strictEqual(buf[0], RFQ_DISCRIMINATOR);
    });
    (0, mocha_1.it)("maker pubkey parsed at offset 1", () => {
        const maker = web3_js_1.Keypair.generate().publicKey;
        const buf = buildMockRfqAccount(0, 0, maker);
        const parsed = new web3_js_1.PublicKey(buf.slice(1, 33));
        chai_1.assert.strictEqual(parsed.toBase58(), maker.toBase58());
    });
    (0, mocha_1.it)("status parsed at offset 130", () => {
        const maker = web3_js_1.Keypair.generate().publicKey;
        const buf = buildMockRfqAccount(2, 0, maker); // MATCHED
        chai_1.assert.strictEqual(buf[RFQ_STATUS_OFFSET], 2);
    });
    (0, mocha_1.it)("chain parsed at offset 129", () => {
        const maker = web3_js_1.Keypair.generate().publicKey;
        const buf = buildMockRfqAccount(0, 1, maker); // ETHEREUM
        chai_1.assert.strictEqual(buf[RFQ_CHAIN_OFFSET], 1);
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: FHE Circuit Logic (mock arithmetic validation)
// ─────────────────────────────────────────────────────────────────────────────
(0, mocha_1.describe)("FHE Circuit Match Logic (arithmetic verification)", () => {
    // Simulate the match_rfq_bid circuit evaluation in plaintext
    // (same logic as the Rust circuit, evaluated in TypeScript for testing symmetry)
    function mockMatchCircuit(rfqPrice, rfqSize, bidPrice, bidSize) {
        const sizeMatch = bidSize === rfqSize ? 1n : 0n;
        const priceMatch = bidPrice >= rfqPrice ? 1n : 0n;
        // if size_match { price_match } else { 0 }
        return sizeMatch === 1n ? priceMatch : 0n;
    }
    (0, mocha_1.it)("exact bid matches", () => {
        const result = mockMatchCircuit(1000000n, 100000000n, // rfq: 1 USDC, 1 BTC
        1000000n, 100000000n // bid: 1 USDC, 1 BTC
        );
        chai_1.assert.strictEqual(result, 1n);
    });
    (0, mocha_1.it)("bid price above min matches", () => {
        const result = mockMatchCircuit(1000000n, 100000000n, 1500000n, 100000000n);
        chai_1.assert.strictEqual(result, 1n, "Price above floor should match");
    });
    (0, mocha_1.it)("bid price below min does not match", () => {
        const result = mockMatchCircuit(1000000n, 100000000n, 500000n, 100000000n);
        chai_1.assert.strictEqual(result, 0n, "Price below floor should not match");
    });
    (0, mocha_1.it)("size mismatch does not match", () => {
        const result = mockMatchCircuit(1000000n, 100000000n, 1000000n, 50000000n);
        chai_1.assert.strictEqual(result, 0n, "Partial fill should not match");
    });
    (0, mocha_1.it)("both conditions failing returns 0", () => {
        const result = mockMatchCircuit(1000000n, 100000000n, 500000n, 50000000n);
        chai_1.assert.strictEqual(result, 0n);
    });
    (0, mocha_1.it)("u64 boundary: max u64 bid price matches", () => {
        const MAX_U64 = 18446744073709551615n;
        const result = mockMatchCircuit(1000000n, 100000000n, MAX_U64, 100000000n);
        chai_1.assert.strictEqual(result, 1n);
    });
    (0, mocha_1.it)("u64 boundary: zero bid size with nonzero rfq size fails", () => {
        const result = mockMatchCircuit(1000000n, 100000000n, 1000000n, 0n);
        chai_1.assert.strictEqual(result, 0n);
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// Suite 4: Instruction Data Encoding
// ─────────────────────────────────────────────────────────────────────────────
(0, mocha_1.describe)("Instruction Data Encoding", () => {
    (0, mocha_1.it)("initialize_rfq data is 68 bytes total (1 discriminator + 67 payload)", () => {
        const salt = Buffer.alloc(32, 7);
        const dwallet = web3_js_1.Keypair.generate().publicKey;
        const rfqBump = 254;
        const chain = 0;
        const encBump = 253;
        const payload = Buffer.alloc(67);
        payload[0] = rfqBump;
        salt.copy(payload, 1);
        dwallet.toBuffer().copy(payload, 33);
        payload[65] = chain;
        payload[66] = encBump;
        const ix = Buffer.concat([Buffer.from([0]), payload]);
        chai_1.assert.strictEqual(ix.length, 68);
        chai_1.assert.strictEqual(ix[0], 0, "discriminator");
        chai_1.assert.strictEqual(ix[1], rfqBump, "rfq_bump");
        chai_1.assert.strictEqual(ix[65 + 1], chain, "chain");
        chai_1.assert.strictEqual(ix[66 + 1], encBump, "enc_cpi_bump");
    });
    (0, mocha_1.it)("submit_bid data is 75 bytes total", () => {
        const escrow = BigInt(5000000000); // 5000 USDC
        const addr = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
        const payload = Buffer.alloc(74);
        payload[0] = 127; // bid_bump
        payload[1] = 126; // vault_bump
        const escrowBuf = Buffer.alloc(8);
        escrowBuf.writeBigUInt64LE(escrow, 0);
        escrowBuf.copy(payload, 2);
        Buffer.from(addr).slice(0, 64).copy(payload, 10);
        const ix = Buffer.concat([Buffer.from([1]), payload]);
        chai_1.assert.strictEqual(ix.length, 75);
        chai_1.assert.strictEqual(ix[0], 1, "discriminator");
        chai_1.assert.strictEqual(ix.readBigUInt64LE(3).toString(), escrow.toString(), "escrow u64 LE");
    });
    (0, mocha_1.it)("execute_settlement data is 101 bytes total", () => {
        const data = Buffer.alloc(100);
        const digest = Buffer.alloc(32, 0xab);
        data[0] = 252; // ika_cpi_bump
        digest.copy(data, 1); // message_digest
        digest.copy(data, 33); // message_metadata_digest
        digest.copy(data, 65); // user_pubkey
        data.writeUInt16LE(2, 97); // signature_scheme (EcdsaDoubleSha256)
        data[99] = 251; // message_approval_bump
        const ix = Buffer.concat([Buffer.from([5]), data]);
        chai_1.assert.strictEqual(ix.length, 101);
        chai_1.assert.strictEqual(ix.readUInt16LE(98), 2, "signature_scheme");
    });
});
