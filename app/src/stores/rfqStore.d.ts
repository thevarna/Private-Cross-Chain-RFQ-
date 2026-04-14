/**
 * RFQ Global Store — Zustand
 *
 * Centralises the entire client-side state machine for the RFQ lifecycle.
 * The `step` field drives the StatusStepper component visually.
 */
import { PublicKey } from "@solana/web3.js";
export type LifecycleStep = "idle" | "encrypting_rfq" | "submitting_rfq" | "awaiting_bid" | "encrypting_bid" | "submitting_bid" | "fhe_computing" | "awaiting_decryptor" | "revealing_match" | "awaiting_mpc_sig" | "settled" | "no_match" | "cancelled";
export interface ActiveRfq {
    rfqPda: PublicKey;
    rfqPriceCt: PublicKey;
    rfqSizeCt: PublicKey;
    dwalletPubkey: PublicKey;
    foreignAssetChain: number;
    salt: Uint8Array;
    makerPubkey: PublicKey;
}
export interface ActiveBid {
    bidPda: PublicKey;
    bidPriceCt: PublicKey;
    bidSizeCt: PublicKey;
    matchResultCt: PublicKey | null;
    decryptionRequest: PublicKey | null;
    messageApproval: PublicKey | null;
    escrowAmount: bigint;
    foreignReceiveAddr: string;
    takerPubkey: PublicKey;
}
export interface SettlementResult {
    matched: boolean;
    ikaSignature: Uint8Array | null;
    usdcTransferSig: string | null;
    settlementTxSig: string | null;
    makerUsdcAmount: bigint | null;
}
interface RfqStore {
    role: "maker" | "taker" | null;
    setRole: (r: "maker" | "taker") => void;
    step: LifecycleStep;
    setStep: (s: LifecycleStep) => void;
    activeRfq: ActiveRfq | null;
    setActiveRfq: (rfq: ActiveRfq | null) => void;
    activeBid: ActiveBid | null;
    setActiveBid: (bid: ActiveBid | null) => void;
    updateBid: (partial: Partial<ActiveBid>) => void;
    settlement: SettlementResult | null;
    setSettlement: (s: SettlementResult) => void;
    txSigs: Record<string, string>;
    recordTxSig: (step: string, sig: string) => void;
    error: string | null;
    setError: (e: string | null) => void;
    reset: () => void;
}
export declare const useRfqStore: import("zustand").UseBoundStore<import("zustand").StoreApi<RfqStore>>;
export {};
