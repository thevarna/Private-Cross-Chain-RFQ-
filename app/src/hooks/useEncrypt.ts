/**
 * useEncrypt — Wrapper for Encrypt pre-alpha gRPC client operations.
 *
 * Provides helpers to:
 * 1. Create input ciphertext accounts (user-provided values → FHE ciphertexts)
 * 2. Poll Solana for ciphertext status (Pending → Verified)
 *
 * NOTE: In the pre-alpha environment, no real FHE is applied.
 * Ciphertexts store plaintext values. The architecture is production-correct.
 */

import { useCallback, useRef } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { POLL_INTERVAL_MS } from "@/lib/constants";

// Ciphertext account layout (per official Encrypt docs):
// bytes 0-31:  ciphertext_digest (32 bytes — the "hash" of the encrypted value)
// bytes 32-63: authorized program pubkey
// bytes 64-95: network_encryption_key pubkey
// bytes 96:    fhe_type (0=EBool, 1=EUint64, ...)
// bytes 97:    status (0=Pending, 1=Verified)
const CT_STATUS_OFFSET  = 97;
const CT_STATUS_VERIFIED = 1;
const CT_FHE_TYPE_EUINT64 = 1;

export function useEncrypt() {
  const { connection } = useConnection();

  /**
   * Poll a ciphertext account until the executor commits the result (status = Verified).
   *
   * @param ctPubkey  The Encrypt ciphertext account to monitor.
   * @param timeoutMs Maximum wait time before throwing (default: 120s).
   */
  const pollCiphertextVerified = useCallback(
    async (ctPubkey: PublicKey, timeoutMs = 120_000): Promise<void> => {
      const deadline = Date.now() + timeoutMs;

      while (Date.now() < deadline) {
        const acct = await connection.getAccountInfo(ctPubkey);
        if (!acct || acct.data.length < 98) {
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        const status = acct.data[CT_STATUS_OFFSET];
        if (status === CT_STATUS_VERIFIED) {
          return;
        }

        await sleep(POLL_INTERVAL_MS);
      }

      throw new Error(`Ciphertext ${ctPubkey.toBase58()} not verified within ${timeoutMs}ms`);
    },
    [connection]
  );

  /**
   * Poll a DecryptionRequest account until the decryptor writes the plaintext result.
   *
   * The DecryptionRequestHeader contains:
   * - bytes_written (how many plaintext bytes have been written)
   * - total_len     (expected total length)
   *
   * When bytes_written == total_len, decryption is complete.
   *
   * @param decryptionRequestPubkey The Encrypt DecryptionRequest account.
   * @param timeoutMs Maximum wait time (default: 120s).
   * @returns The decrypted u64 value.
   */
  const pollDecryptionResult = useCallback(
    async (
      decryptionRequestPubkey: PublicKey,
      timeoutMs = 120_000
    ): Promise<bigint> => {
      const deadline = Date.now() + timeoutMs;

      while (Date.now() < deadline) {
        const acct = await connection.getAccountInfo(decryptionRequestPubkey);
        if (!acct || acct.data.length < 50) {
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        const data = acct.data;
        // DecryptionRequestHeader layout (approximate from Encrypt docs):
        // byte 0:     discriminator (= DECRYPTION_REQUEST discriminator)
        // bytes 1-32: ciphertext_digest
        // bytes 33-34: total_len (u16 LE)
        // bytes 35-36: bytes_written (u16 LE)
        // bytes 37+:  plaintext data
        const totalLen    = data.readUInt16LE(33);
        const bytesWritten = data.readUInt16LE(35);

        if (bytesWritten >= totalLen && totalLen > 0) {
          // Read the u64 plaintext value (first 8 bytes of plaintext data)
          const plaintextOffset = 37;
          const value = data.readBigUInt64LE(plaintextOffset);
          return value;
        }

        await sleep(POLL_INTERVAL_MS);
      }

      throw new Error(
        `DecryptionRequest ${decryptionRequestPubkey.toBase58()} not complete after ${timeoutMs}ms`
      );
    },
    [connection]
  );

  /**
   * Read the current status of a ciphertext account.
   * Returns true if verified, false if still pending.
   */
  const getCiphertextStatus = useCallback(
    async (ctPubkey: PublicKey): Promise<"verified" | "pending" | "missing"> => {
      const acct = await connection.getAccountInfo(ctPubkey);
      if (!acct || acct.data.length < 98) return "missing";
      return acct.data[CT_STATUS_OFFSET] === CT_STATUS_VERIFIED ? "verified" : "pending";
    },
    [connection]
  );

  return {
    pollCiphertextVerified,
    pollDecryptionResult,
    getCiphertextStatus,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
