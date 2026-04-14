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
import { PublicKey } from "@solana/web3.js";
export declare function useEncrypt(): {
    pollCiphertextVerified: (ctPubkey: PublicKey, timeoutMs?: number) => Promise<void>;
    pollDecryptionResult: (decryptionRequestPubkey: PublicKey, timeoutMs?: number) => Promise<bigint>;
    getCiphertextStatus: (ctPubkey: PublicKey) => Promise<"verified" | "pending" | "missing">;
};
