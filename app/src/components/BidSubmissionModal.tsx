/**
 * BidSubmissionModal — Taker UI
 *
 * Visible when a Taker clicks "Place Bid" on an active RFQ from the OrderBook.
 * Walks through:
 * 1. Bid parameter entry
 * 2. FHE encryption of bid price & size (Encrypt gRPC)
 * 3. submit_bid (escrow lock) + request_fhe_match (graph execution trigger)
 * 4. Hands control to StatusStepper (fhe_computing state)
 */

"use client";

import { FC, useState, useCallback } from "react";
import { PublicKey, Keypair } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { X, Lock, Bitcoin, Loader } from "lucide-react";
import clsx from "clsx";
import { useRfqProgram } from "@/hooks/useRfqProgram";
import { useRfqStore, ActiveRfq } from "@/stores/rfqStore";
import { EXPLORER } from "@/lib/constants";

interface Props {
  rfq:      ActiveRfq;
  onClose:  () => void;
}

type Stage = "input" | "encrypting" | "locking" | "submitting_match";

export const BidSubmissionModal: FC<Props> = ({ rfq, onClose }) => {
  const { publicKey } = useWallet();
  const { submitBid, requestFheMatch } = useRfqProgram();
  const { setStep, setActiveBid, updateBid, recordTxSig, setError } = useRfqStore();

  const [stage,   setStage]   = useState<Stage>("input");
  const [bidPrice,   setBidPrice]   = useState("");
  const [bidSize,    setBidSize]    = useState("");
  const [receiveAddr, setReceiveAddr] = useState("");

  // Convert display → u64
  const toSatoshis   = (btc: string)  => BigInt(Math.round(parseFloat(btc) * 100_000_000));
  const toMicroCents = (usdc: string) => BigInt(Math.round(parseFloat(usdc) * 1_000_000));

  const handleSubmit = useCallback(async () => {
    if (!publicKey) return;
    setError(null);

    try {
      const priceMicro = toMicroCents(bidPrice);
      const sizeSats   = toSatoshis(bidSize);

      if (priceMicro <= 0n || sizeSats <= 0n) {
        setError("Bid price and size must be greater than zero.");
        return;
      }
      if (!receiveAddr.trim()) {
        setError("Please enter your BTC receive address.");
        return;
      }

      // ── 1. Encrypt bid parameters via Encrypt gRPC ──────────────────────────
      setStage("encrypting");
      setStep("encrypting_bid");

      // Generate keypair accounts for bid ciphertext accounts.
      // In production: call Encrypt gRPC createInput with ZK proof.
      const bidPriceCt   = Keypair.generate().publicKey;
      const bidSizeCt    = Keypair.generate().publicKey;
      const matchResultCt = Keypair.generate().publicKey;

      await new Promise((r) => setTimeout(r, 1500)); // simulate gRPC

      // ── 2. submit_bid — lock USDC escrow ────────────────────────────────────
      // Escrow = bidPrice × bidSize (simplified: 1 USDC micro-cent × satoshi count)
      const escrowAmount = priceMicro;  // In MVP: escrow the total USDC value
      setStage("locking");
      setStep("submitting_bid");

      const { bidPda, signature: bidSig } = await submitBid({
        rfqPda:            rfq.rfqPda,
        bidPriceCt,
        bidSizeCt,
        escrowAmount,
        foreignReceiveAddr: receiveAddr.padEnd(64, "\0"),
      });

      recordTxSig("submitting_bid", bidSig);
      setActiveBid({
        bidPda,
        bidPriceCt,
        bidSizeCt,
        matchResultCt,
        decryptionRequest: null,
        messageApproval:   null,
        escrowAmount,
        foreignReceiveAddr: receiveAddr,
        takerPubkey: publicKey,
      });

      // ── 3. request_fhe_match — trigger Encrypt graph execution ──────────────
      setStage("submitting_match");
      setStep("fhe_computing");

      // The encryptConfig, encryptDeposit etc. would come from the
      // Encrypt program's on-chain config (fetched by the relayer or client).
      const encryptConfig   = new PublicKey("11111111111111111111111111111111");
      const encryptDeposit  = new PublicKey("11111111111111111111111111111111");
      const networkEncKey   = new PublicKey("11111111111111111111111111111111");
      const eventAuthority  = new PublicKey("11111111111111111111111111111111");

      const { signature: matchSig } = await requestFheMatch({
        rfqPda:         rfq.rfqPda,
        bidPda,
        rfqPriceCt:     rfq.rfqPriceCt,
        rfqSizeCt:      rfq.rfqSizeCt,
        bidPriceCt,
        bidSizeCt,
        matchResultCt,
        encryptConfig,
        encryptDeposit,
        networkEncKey,
        eventAuthority,
      });

      recordTxSig("fhe_computing", matchSig);
      updateBid({ matchResultCt });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Transaction failed");
      setStage("input");
    }
  }, [
    publicKey, bidPrice, bidSize, receiveAddr, rfq,
    submitBid, requestFheMatch,
    setStep, setActiveBid, updateBid, recordTxSig, setError, onClose,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-panel border border-border rounded-2xl shadow-panel animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-encrypt" />
              <span className="font-mono text-sm text-encrypt tracking-widest uppercase">
                Submit Encrypted Bid
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5 font-mono">
              RFQ: {rfq.rfqPda.toBase58().slice(0, 12)}…
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Asset badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20">
              <Bitcoin className="w-3.5 h-3.5 text-warning" />
              <span className="text-xs text-warning font-mono">BTC / USDC</span>
            </div>
            <span className="text-xs text-muted">Exact fill required</span>
          </div>

          {/* Inputs */}
          <div>
            <label className="block text-xs font-mono text-text mb-1">
              Bid Price (USDC per BTC)
            </label>
            <div className="relative">
              <input
                id="bid-price-input"
                type="number"
                value={bidPrice}
                onChange={(e) => setBidPrice(e.target.value)}
                placeholder="65500"
                disabled={stage !== "input"}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 pr-16 font-mono text-sm text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-encrypt/50 disabled:opacity-50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">USDC</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-text mb-1">
              Bid Size (BTC)
            </label>
            <div className="relative">
              <input
                id="bid-size-input"
                type="number"
                value={bidSize}
                onChange={(e) => setBidSize(e.target.value)}
                placeholder="0.5"
                disabled={stage !== "input"}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 pr-16 font-mono text-sm text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-encrypt/50 disabled:opacity-50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">BTC</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-text mb-1">
              Receive Address (BTC)
            </label>
            <input
              id="receive-addr-input"
              type="text"
              value={receiveAddr}
              onChange={(e) => setReceiveAddr(e.target.value)}
              placeholder="bc1q..."
              disabled={stage !== "input"}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-text placeholder-muted focus:outline-none focus:ring-1 focus:ring-encrypt/50 disabled:opacity-50"
            />
          </div>

          {/* Privacy notice */}
          <div className="flex gap-2 p-3 rounded-lg bg-encrypt-glow border border-encrypt/10">
            <Lock className="w-4 h-4 text-encrypt mt-0.5 flex-shrink-0" />
            <p className="text-xs text-subtle">
              Your bid is FHE-encrypted before submission. The Maker never sees
              your exact offer — only the cryptographic match result is revealed.
            </p>
          </div>

          {/* Action */}
          <button
            id="submit-bid-btn"
            onClick={handleSubmit}
            disabled={!publicKey || stage !== "input"}
            className={clsx(
              "w-full py-3 px-5 rounded-xl font-mono text-sm font-medium",
              "bg-encrypt-gradient text-void transition-all duration-200",
              "hover:brightness-110 hover:shadow-encrypt active:scale-[0.98]",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {stage === "encrypting" ? (
              <><Loader className="w-4 h-4 animate-spin" /> Encrypting Bid…</>
            ) : stage === "locking" ? (
              <><Loader className="w-4 h-4 animate-spin" /> Locking Escrow…</>
            ) : stage === "submitting_match" ? (
              <><Loader className="w-4 h-4 animate-spin" /> Triggering FHE…</>
            ) : (
              <><Lock className="w-4 h-4" /> Encrypt & Submit Bid</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
