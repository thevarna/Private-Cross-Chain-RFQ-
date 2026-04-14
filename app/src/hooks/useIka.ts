/**
 * useIka — Wrapper for Ika dWallet network interactions.
 *
 * Provides:
 * 1. Polling the MessageApproval PDA until the NOA commits a signature
 * 2. PDA derivation utilities for Ika-specific accounts
 *
 * Flow (per official Ika docs):
 * 1. Program CPIs approve_message → MessageApproval PDA created (status = Pending)
 * 2. Ika NOA detects the PDA, runs 2PC-MPC signing
 * 3. NOA calls CommitSignature → MessageApproval updated (status = Signed)
 * 4. We poll until status == 1, then read the signature bytes
 *
 * MessageApproval PDA layout (287-312 bytes per Ika docs):
 * - bytes 0-1:    discriminator (= 14, version = 1)
 * - bytes 2-33:   dwallet pubkey chunks reference
 * - bytes 34-65:  message_digest
 * - bytes 66-129: various metadata
 * - byte 172:     status (0=Pending, 1=Signed)
 * - bytes 173-174: signature_len (u16 LE)
 * - bytes 175+:   signature bytes (64 bytes for Ed25519, ECDSA compact)
 */

import { useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { IKA_DWALLET_PROGRAM_ID, IKA_CPI_SEED, POLL_INTERVAL_MS } from "@/lib/constants";

const IKA_PID = new PublicKey(IKA_DWALLET_PROGRAM_ID);

// MessageApproval account byte offsets (from official Ika docs layout)
const MSG_APPROVAL_STATUS_OFFSET    = 172;
const MSG_APPROVAL_SIG_LEN_OFFSET   = 173;
const MSG_APPROVAL_SIG_DATA_OFFSET  = 175;
const MSG_APPROVAL_STATUS_SIGNED    = 1;

export function useIka() {
  const { connection } = useConnection();

  /**
   * Derive this program's Ika CPI authority PDA.
   * Seeds: [b"__ika_cpi_authority"], program = PRIVATE_RFQ_PROGRAM_ID
   */
  const deriveCpiAuthority = useCallback(
    (programId: PublicKey): [PublicKey, number] => {
      return PublicKey.findProgramAddressSync(
        [IKA_CPI_SEED],
        programId
      );
    },
    []
  );

  /**
   * Derive the MessageApproval PDA.
   *
   * From official Ika docs:
   * Seeds: ["dwallet", chunks..., "message_approval", scheme_u16_le, message_digest, [metadata_digest]]
   * Program: IKA_DWALLET_PROGRAM_ID
   *
   * The "chunks" are derived from curve_u16_le || public_key split into 32-byte chunks.
   * For Secp256k1 (33-byte compressed key): 35 bytes → [32, 3] = 2 chunks.
   *
   * For the MVP, we accept the pre-computed PDA bump from the client.
   */
  const deriveMessageApprovalPda = useCallback(
    (
      dwalletPublicKeyBytes: Uint8Array,  // Raw public key bytes (33 for secp256k1)
      curveId: number,                     // e.g., 1 for secp256k1
      messageDigest: Uint8Array,           // 32-byte keccak256 hash
      signatureScheme: number,             // u16 DWalletSignatureScheme
    ): [PublicKey, number] => {
      // Construct curve_u16_le || public_key buffer
      const curveBuf = Buffer.alloc(2);
      curveBuf.writeUInt16LE(curveId, 0);
      const combined = Buffer.concat([curveBuf, Buffer.from(dwalletPublicKeyBytes)]);

      // Split into 32-byte chunks
      const chunks: Buffer[] = [];
      for (let i = 0; i < combined.length; i += 32) {
        chunks.push(combined.slice(i, i + 32));
      }

      // Scheme as u16 LE
      const schemeBuf = Buffer.alloc(2);
      schemeBuf.writeUInt16LE(signatureScheme, 0);

      return PublicKey.findProgramAddressSync(
        [
          Buffer.from("dwallet"),
          ...chunks,
          Buffer.from("message_approval"),
          schemeBuf,
          Buffer.from(messageDigest),
        ],
        IKA_PID
      );
    },
    []
  );

  /**
   * Poll the MessageApproval PDA until the NOA commits the signature.
   *
   * @param messageApprovalPda  The PDA created by approve_message CPI.
   * @param timeoutMs           Maximum wait (default: 180s — 2PC-MPC takes longer).
   * @returns The committed signature bytes.
   */
  const pollMessageApprovalSigned = useCallback(
    async (
      messageApprovalPda: PublicKey,
      timeoutMs = 180_000
    ): Promise<Uint8Array> => {
      const deadline = Date.now() + timeoutMs;

      while (Date.now() < deadline) {
        const acct = await connection.getAccountInfo(messageApprovalPda);
        if (!acct || acct.data.length < 176) {
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        const data   = acct.data;
        const status = data[MSG_APPROVAL_STATUS_OFFSET];

        if (status === MSG_APPROVAL_STATUS_SIGNED) {
          const sigLen = data.readUInt16LE(MSG_APPROVAL_SIG_LEN_OFFSET);
          const sigBytes = data.slice(
            MSG_APPROVAL_SIG_DATA_OFFSET,
            MSG_APPROVAL_SIG_DATA_OFFSET + sigLen
          );
          return new Uint8Array(sigBytes);
        }

        await sleep(POLL_INTERVAL_MS);
      }

      throw new Error(
        `MessageApproval ${messageApprovalPda.toBase58()} not signed within ${timeoutMs}ms`
      );
    },
    [connection]
  );

  /**
   * Check the current status of a MessageApproval PDA without blocking.
   */
  const getMessageApprovalStatus = useCallback(
    async (
      messageApprovalPda: PublicKey
    ): Promise<"pending" | "signed" | "missing"> => {
      const acct = await connection.getAccountInfo(messageApprovalPda);
      if (!acct || acct.data.length < 176) return "missing";
      return acct.data[MSG_APPROVAL_STATUS_OFFSET] === MSG_APPROVAL_STATUS_SIGNED
        ? "signed"
        : "pending";
    },
    [connection]
  );

  return {
    deriveCpiAuthority,
    deriveMessageApprovalPda,
    pollMessageApprovalSigned,
    getMessageApprovalStatus,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
