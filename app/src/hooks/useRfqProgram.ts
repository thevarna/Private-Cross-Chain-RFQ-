/**
 * useRfqProgram — Anchor-style transaction builders for the private_rfq program.
 *
 * Since we built the on-chain program with Pinocchio (not Anchor), we manually
 * construct the instruction data and account metas following the exact layout
 * documented in each instruction module.
 */

import { useCallback } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  AccountMeta,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PRIVATE_RFQ_PROGRAM_ID,
  USDC_MINT,
  RFQ_SEED,
  BID_SEED,
  VAULT_SEED,
  ENCRYPT_CPI_SEED,
  IKA_CPI_SEED,
  ENCRYPT_PROGRAM_ID,
  IKA_DWALLET_PROGRAM_ID,
} from "@/lib/constants";

const PROGRAM_ID = new PublicKey(PRIVATE_RFQ_PROGRAM_ID);
const ENCRYPT_PID = new PublicKey(ENCRYPT_PROGRAM_ID);
const IKA_PID = new PublicKey(IKA_DWALLET_PROGRAM_ID);
const USDC_MINT_PK = new PublicKey(USDC_MINT);

// ─── PDA Derivation Helpers ──────────────────────────────────────────────────

export async function findRfqPda(maker: PublicKey, salt: Uint8Array): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [RFQ_SEED, maker.toBuffer(), salt],
    PROGRAM_ID
  );
}

export async function findBidPda(rfqPda: PublicKey, taker: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [BID_SEED, rfqPda.toBuffer(), taker.toBuffer()],
    PROGRAM_ID
  );
}

export async function findVaultPda(rfqPda: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, rfqPda.toBuffer()],
    PROGRAM_ID
  );
}

export function findEncryptCpiAuthority(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([ENCRYPT_CPI_SEED], PROGRAM_ID);
}

export function findIkaCpiAuthority(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([IKA_CPI_SEED], PROGRAM_ID);
}

// ─── Main Hook ───────────────────────────────────────────────────────────────

export function useRfqProgram() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  // ── Instruction 0: initialize_rfq ─────────────────────────────────────────
  const initializeRfq = useCallback(
    async (params: {
      salt:               Uint8Array;     // 32-byte random salt
      dwalletPubkey:      PublicKey;      // Ika dWallet account PDA
      foreignAssetChain:  number;         // 0=BTC, 1=ETH
      rfqPriceCt:         PublicKey;      // Encrypt ciphertext account (price)
      rfqSizeCt:          PublicKey;      // Encrypt ciphertext account (size)
      encryptConfig:      PublicKey;
      encryptDeposit:     PublicKey;
      networkEncKey:      PublicKey;
      eventAuthority:     PublicKey;
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      const [rfqPda, rfqBump]   = await findRfqPda(publicKey, params.salt);
      const [encryptCpi, encBmp] = findEncryptCpiAuthority();

      // Instruction data: rfq_bump(1) + salt(32) + dwallet(32) + chain(1) + enc_cpi_bump(1) = 67
      const data = Buffer.alloc(67);
      data.writeUInt8(rfqBump, 0);
      data.set(params.salt, 1);
      data.set(params.dwalletPubkey.toBuffer(), 33);
      data.writeUInt8(params.foreignAssetChain, 65);
      data.writeUInt8(encBmp, 66);

      // Prefix with discriminator byte 0
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: rfqPda,                 isSigner: false, isWritable: true  },
          { pubkey: publicKey,              isSigner: true,  isWritable: false },
          { pubkey: params.rfqPriceCt,      isSigner: false, isWritable: false },
          { pubkey: params.rfqSizeCt,       isSigner: false, isWritable: false },
          { pubkey: publicKey,              isSigner: true,  isWritable: true  }, // payer
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([Buffer.from([0]), data]),
      });

      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      return { rfqPda, signature: sig };
    },
    [publicKey, connection, sendTransaction]
  );

  // ── Instruction 1: submit_bid ──────────────────────────────────────────────
  const submitBid = useCallback(
    async (params: {
      rfqPda:           PublicKey;
      bidPriceCt:       PublicKey;
      bidSizeCt:        PublicKey;
      escrowAmount:     bigint;  // USDC lamports (6 decimals)
      foreignReceiveAddr: string; // BTC/ETH address
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      const [bidPda, bidBump]     = await findBidPda(params.rfqPda, publicKey);
      const [vaultPda, vaultBump] = await findVaultPda(params.rfqPda);
      const takerUsdcAcct = await getAssociatedTokenAddress(USDC_MINT_PK, publicKey);

      // Instruction data: bid_bump(1) + vault_bump(1) + escrow(8) + addr(64) = 74
      const data = Buffer.alloc(74);
      data.writeUInt8(bidBump, 0);
      data.writeUInt8(vaultBump, 1);
      // Write escrow_amount as u64 LE
      const escrowBuf = Buffer.alloc(8);
      const escrowBigInt = params.escrowAmount;
      escrowBuf.writeBigUInt64LE(escrowBigInt, 0);
      escrowBuf.copy(data, 2);
      // Write foreign_receive_addr padded to 64 bytes
      const addrBuf = Buffer.from(params.foreignReceiveAddr, "utf-8").slice(0, 64);
      addrBuf.copy(data, 10);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: bidPda,              isSigner: false, isWritable: true  },
          { pubkey: params.rfqPda,       isSigner: false, isWritable: true  },
          { pubkey: publicKey,           isSigner: true,  isWritable: false },
          { pubkey: params.bidPriceCt,   isSigner: false, isWritable: false },
          { pubkey: params.bidSizeCt,    isSigner: false, isWritable: false },
          { pubkey: vaultPda,            isSigner: false, isWritable: true  },
          { pubkey: takerUsdcAcct,       isSigner: false, isWritable: true  },
          { pubkey: USDC_MINT_PK,        isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID,    isSigner: false, isWritable: false },
          { pubkey: publicKey,           isSigner: true,  isWritable: true  }, // payer
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([Buffer.from([1]), data]),
      });

      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      return { bidPda, signature: sig };
    },
    [publicKey, connection, sendTransaction]
  );

  // ── Instruction 2: request_fhe_match ──────────────────────────────────────
  const requestFheMatch = useCallback(
    async (params: {
      rfqPda:        PublicKey;
      bidPda:        PublicKey;
      rfqPriceCt:    PublicKey;
      rfqSizeCt:     PublicKey;
      bidPriceCt:    PublicKey;
      bidSizeCt:     PublicKey;
      matchResultCt: PublicKey;  // New keypair to hold the output
      encryptConfig: PublicKey;
      encryptDeposit: PublicKey;
      networkEncKey: PublicKey;
      eventAuthority: PublicKey;
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      const [encryptCpi, encBmp] = findEncryptCpiAuthority();

      const data = Buffer.from([encBmp, 0]); // encrypt_cpi_bump + reserved

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: params.rfqPda,         isSigner: false, isWritable: true  },
          { pubkey: params.bidPda,         isSigner: false, isWritable: true  },
          { pubkey: publicKey,             isSigner: true,  isWritable: true  }, // payer
        ],
        data: Buffer.concat([Buffer.from([2]), data]),
      });

      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      return { signature: sig };
    },
    [publicKey, connection, sendTransaction]
  );

  // ── Instruction 3: request_match_decrypt ──────────────────────────────────
  const requestMatchDecrypt = useCallback(
    async (params: {
      rfqPda:            PublicKey;
      bidPda:            PublicKey;
      matchResultCt:     PublicKey;
      decryptionRequest: PublicKey;  // New keypair account
      encryptConfig:     PublicKey;
      encryptDeposit:    PublicKey;
      networkEncKey:     PublicKey;
      eventAuthority:    PublicKey;
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      const [encryptCpi, encBmp] = findEncryptCpiAuthority();
      const data = Buffer.from([encBmp]);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: params.rfqPda,             isSigner: false, isWritable: true  },
          { pubkey: params.bidPda,             isSigner: false, isWritable: true  },
          { pubkey: publicKey,                 isSigner: true,  isWritable: true  }, // payer
        ],
        data: Buffer.concat([Buffer.from([3]), data]),
      });

      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      return { signature: sig };
    },
    [publicKey, connection, sendTransaction]
  );

  // ── Instruction 4: reveal_match ───────────────────────────────────────────
  const revealMatch = useCallback(
    async (params: {
      rfqPda:            PublicKey;
      bidPda:            PublicKey;
      decryptionRequest: PublicKey;
      makerUsdcAcct:     PublicKey;
      takerUsdcAcct:     PublicKey;
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      const [vaultPda, vaultBump] = await findVaultPda(params.rfqPda);

      const data = Buffer.from([vaultBump, 0]);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: params.rfqPda,            isSigner: false, isWritable: true  },
          { pubkey: params.bidPda,            isSigner: false, isWritable: true  },
          { pubkey: publicKey,                isSigner: true,  isWritable: true  }, // payer
        ],
        data: Buffer.concat([Buffer.from([4]), data]),
      });

      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      return { signature: sig };
    },
    [publicKey, connection, sendTransaction]
  );

  // ── Instruction 5: execute_settlement ─────────────────────────────────────
  const executeSettlement = useCallback(
    async (params: {
      rfqPda:                  PublicKey;
      dwalletCoordinator:      PublicKey;
      messageApproval:         PublicKey;
      dwalletPda:              PublicKey;
      messageDigest:           Uint8Array;   // keccak256(foreign_tx_bytes)
      messageMetadataDigest:   Uint8Array;   // [0;32] if no metadata
      userPubkey:              Uint8Array;   // Maker's pubkey bytes
      signatureScheme:         number;       // 2 = EcdsaDoubleSha256 for BTC
      messageApprovalBump:     number;
    }) => {
      if (!publicKey) throw new Error("Wallet not connected");

      const [ikaCpi, ikaBmp] = findIkaCpiAuthority();

      // Data: ika_cpi_bump(1) + msg_digest(32) + meta_digest(32) + user_pk(32) + scheme(2) + approval_bump(1) = 100
      const data = Buffer.alloc(100);
      data.writeUInt8(ikaBmp, 0);
      Buffer.from(params.messageDigest).copy(data, 1);
      Buffer.from(params.messageMetadataDigest).copy(data, 33);
      Buffer.from(params.userPubkey).copy(data, 65);
      data.writeUInt16LE(params.signatureScheme, 97);
      data.writeUInt8(params.messageApprovalBump, 99);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: params.rfqPda,             isSigner: false, isWritable: true  },
          { pubkey: publicKey,                 isSigner: true,  isWritable: false },
          { pubkey: params.dwalletCoordinator, isSigner: false, isWritable: false },
          { pubkey: params.messageApproval,    isSigner: false, isWritable: true  },
          { pubkey: params.dwalletPda,         isSigner: false, isWritable: false },
          { pubkey: ikaCpi,                    isSigner: false, isWritable: false },
          { pubkey: PROGRAM_ID,                isSigner: false, isWritable: false },
          { pubkey: IKA_PID,                   isSigner: false, isWritable: false },
          { pubkey: publicKey,                 isSigner: true,  isWritable: true  }, // payer
          { pubkey: SystemProgram.programId,   isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([Buffer.from([5]), data]),
      });

      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      return { signature: sig };
    },
    [publicKey, connection, sendTransaction]
  );

  return {
    initializeRfq,
    submitBid,
    requestFheMatch,
    requestMatchDecrypt,
    revealMatch,
    executeSettlement,
  };
}
