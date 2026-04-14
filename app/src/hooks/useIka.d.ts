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
import { PublicKey } from "@solana/web3.js";
export declare function useIka(): {
    deriveCpiAuthority: (programId: PublicKey) => [PublicKey, number];
    deriveMessageApprovalPda: (dwalletPublicKeyBytes: Uint8Array, curveId: number, messageDigest: Uint8Array, signatureScheme: number) => [PublicKey, number];
    pollMessageApprovalSigned: (messageApprovalPda: PublicKey, timeoutMs?: number) => Promise<Uint8Array>;
    getMessageApprovalStatus: (messageApprovalPda: PublicKey) => Promise<"pending" | "signed" | "missing">;
};
