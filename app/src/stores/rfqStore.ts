/**
 * RFQ Global Store — Zustand
 *
 * Centralises the entire client-side state machine for the RFQ lifecycle.
 * The `step` field drives the StatusStepper component visually.
 */

import { create } from "zustand";
import { PublicKey } from "@solana/web3.js";

// 8-step lifecycle enum mirroring the on-chain state machine
export type LifecycleStep =
  | "idle"
  | "encrypting_rfq"       // Step 1: Creating ciphertext accounts for Maker
  | "submitting_rfq"       // Step 2: initialize_rfq tx confirming
  | "awaiting_bid"         // Step 3: RFQ live, waiting for a Taker
  | "encrypting_bid"       // Step 3b: Taker creating bid ciphertext accounts
  | "submitting_bid"       // Step 4: submit_bid tx confirming
  | "fhe_computing"        // Step 5: Encrypt executor running match_rfq_bid graph
  | "awaiting_decryptor"   // Step 6: Encrypt decryptor generating plaintext
  | "revealing_match"      // Step 7: reveal_match tx; USDC moving
  | "awaiting_mpc_sig"     // Step 8: Ika 2PC-MPC signing in progress
  | "settled"              // Step 9: MessageApproval signed; done
  | "no_match"             // Terminal: Bid rejected, USDC refunded
  | "cancelled";           // Terminal: Force timeout invoked

export interface ActiveRfq {
  rfqPda:             PublicKey;
  rfqPriceCt:         PublicKey;  // Encrypt ciphertext pubkey (price)
  rfqSizeCt:          PublicKey;  // Encrypt ciphertext pubkey (size)
  dwalletPubkey:      PublicKey;
  foreignAssetChain:  number;
  salt:               Uint8Array;
  makerPubkey:        PublicKey;
}

export interface ActiveBid {
  bidPda:             PublicKey;
  bidPriceCt:         PublicKey;
  bidSizeCt:          PublicKey;
  matchResultCt:      PublicKey | null;
  decryptionRequest:  PublicKey | null;
  messageApproval:    PublicKey | null;
  escrowAmount:       bigint;
  foreignReceiveAddr: string;
  takerPubkey:        PublicKey;
}

export interface SettlementResult {
  matched:         boolean;
  ikaSignature:    Uint8Array | null;
  usdcTransferSig: string | null;      // Solana tx signature
  settlementTxSig: string | null;
  makerUsdcAmount: bigint | null;
}

interface RfqStore {
  // ── UI Role ────────────────────────────────────────────────────────────────
  role: "maker" | "taker" | null;
  setRole: (r: "maker" | "taker") => void;

  // ── Lifecycle Step ─────────────────────────────────────────────────────────
  step: LifecycleStep;
  setStep: (s: LifecycleStep) => void;

  // ── Active RFQ ─────────────────────────────────────────────────────────────
  activeRfq: ActiveRfq | null;
  setActiveRfq: (rfq: ActiveRfq | null) => void;

  // ── Active Bid ─────────────────────────────────────────────────────────────
  activeBid: ActiveBid | null;
  setActiveBid: (bid: ActiveBid | null) => void;
  updateBid: (partial: Partial<ActiveBid>) => void;

  // ── Settlement Result ──────────────────────────────────────────────────────
  settlement: SettlementResult | null;
  setSettlement: (s: SettlementResult) => void;

  // ── Tx Signatures (for Explorer links) ────────────────────────────────────
  txSigs: Record<string, string>; // step name → txSignature
  recordTxSig: (step: string, sig: string) => void;

  // ── Error state ────────────────────────────────────────────────────────────
  error: string | null;
  setError: (e: string | null) => void;

  // ── Reset ──────────────────────────────────────────────────────────────────
  reset: () => void;
}

const initial: Pick<
  RfqStore,
  "role" | "step" | "activeRfq" | "activeBid" | "settlement" | "txSigs" | "error"
> = {
  role:       null,
  step:       "idle",
  activeRfq:  null,
  activeBid:  null,
  settlement: null,
  txSigs:     {},
  error:      null,
};

export const useRfqStore = create<RfqStore>((set) => ({
  ...initial,

  setRole:    (role)    => set({ role }),
  setStep:    (step)    => set({ step }),
  setActiveRfq: (rfq)  => set({ activeRfq: rfq }),
  setActiveBid: (bid)  => set({ activeBid: bid }),
  updateBid:  (partial) =>
    set((s) => ({
      activeBid: s.activeBid ? { ...s.activeBid, ...partial } : null,
    })),
  setSettlement: (s)   => set({ settlement: s }),
  recordTxSig: (stepName, sig) =>
    set((s) => ({ txSigs: { ...s.txSigs, [stepName]: sig } })),
  setError:   (error)  => set({ error }),
  reset:      ()       => set({ ...initial }),
}));
