"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Loader } from "lucide-react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import clsx from "clsx";

import { useRfqStore, ActiveRfq } from "@/stores/rfqStore";
import { BidSubmissionModal } from "@/components/BidSubmissionModal";
import { StatusStepper } from "@/components/StatusStepper";
import { SettlementDashboard } from "@/components/SettlementDashboard";

export default function TradeDetailsPage() {
  const { rfqId } = useParams();
  const router = useRouter();
  const { step, activeBid, settlement, txSigs } = useRfqStore();
  
  const [rfq, setRfq] = useState<ActiveRfq | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRfq() {
      if (!rfqId || typeof rfqId !== "string") return;
      try {
        const res = await fetch(`http://localhost:3001/api/rfqs/${rfqId}`);
        if (!res.ok) {
          throw new Error("RFQ not found");
        }
        // The API returns the raw record. We need to construct the ActiveRfq object.
        // For the demo, we assume the Taker flow requires the Ciphertext accounts which
        // are NOT stored in the Relayer DB (they are only in the Solana Account Data).
        // Since this is a demo without a fully built out indexer, we will rely on the 
        // activeRfq already being in the store if they clicked from the OrderBook.
        // If it's not there, we redirect back to the desk.
      } catch (err) {
        setError("Failed to load RFQ");
      }
    }
    fetchRfq();
  }, [rfqId]);

  // Temporary hack for the demo: If the activeRfq isn't in the store, redirect to desk.
  // In a real app, the relayer would serve all necessary fields (ciphertexts, salt, etc.)
  const { activeRfq } = useRfqStore();
  
  useEffect(() => {
    if (activeRfq && activeRfq.rfqPda.toBase58() === rfqId) {
      setRfq(activeRfq);
      setLoading(false);
    } else {
      router.push("/trade");
    }
  }, [activeRfq, rfqId, router]);

  if (loading) {
    return (
      <div className="h-full min-h-[500px] flex items-center justify-center">
        <Loader className="w-8 h-8 text-encrypt animate-spin" />
      </div>
    );
  }

  if (!rfq) return null;

  const showStepper = [
    "encrypting_bid",
    "submitting_bid",
    "fhe_computing",
    "awaiting_decryptor",
    "revealing_match",
    "awaiting_mpc_sig",
  ].includes(step);

  const showSettlement = (step === "settled" || step === "no_match") && settlement;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 h-full animate-fade-in pb-12">
      <Link 
        href="/trade" 
        className="inline-flex items-center gap-2 text-sm font-mono text-muted hover:text-text transition-colors w-fit"
      >
        <div className="w-8 h-8 rounded-full bg-panel border border-border flex items-center justify-center group-hover:bg-surface transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </div>
        Back to Live Desk
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-12">
          {showSettlement && activeBid ? (
            <div className="glass-card p-1 shadow-2xl animate-slide-up">
              <div className="p-1 rounded-[calc(1rem-1px)] border border-white/[0.03]">
                <SettlementDashboard
                  rfq={rfq}
                  bid={activeBid}
                  settlement={settlement!}
                  txSigs={txSigs}
                />
              </div>
            </div>
          ) : showStepper ? (
            <div className="glass-card p-10 shadow-2xl animate-fade-in">
              <StatusStepper
                currentStep={step}
                escrowAmount={activeBid?.escrowAmount}
                ikaSignature={settlement?.ikaSignature ?? null}
                txSigs={txSigs}
              />
            </div>
          ) : (
            <div className="glass-card p-10 shadow-2xl animate-slide-up relative overflow-hidden">
               {/* Subtle background glow */}
               <div className="absolute -top-40 -left-40 w-80 h-80 bg-ika/10 rounded-full blur-[100px] pointer-events-none" />
               <div className="relative z-10">
                 <h2 className="text-2xl font-mono text-text font-bold mb-6 tracking-tight">Submit Sealed Bid</h2>
                 {/* Re-use the modal content but inline */}
                 <BidSubmissionModal rfq={rfq} onClose={() => {}} />
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
