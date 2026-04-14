/**
 * StatusStepper — 8-Step FHE × MPC Lifecycle Visualizer
 *
 * This component is the centrepiece of the Maker/Taker UX.
 * It renders a vertical stepper that animates through all phases of the RFQ,
 * from initial encryption to final Ika signature commitment.
 *
 * Each step maps to a discrete on-chain state transition, making the
 * invisible cryptographic processes tangible for judges and traders alike.
 */

"use client";

import React, { FC, useEffect, useState } from "react";
import { CheckCircle, Circle, Loader, Lock, Zap, Radio, Shield, ArrowRight, EyeOff } from "lucide-react";
import clsx from "clsx";
import { LifecycleStep } from "@/stores/rfqStore";

interface Step {
  id: LifecycleStep;
  label: string;
  sublabel: string;
  icon: any; // Using any to resolve LucideIcon vs FC<{className, style}> mismatch across React versions
  badge: "encrypt" | "ika" | "solana" | "user";
}

const STEPS: Step[] = [
  {
    id: "encrypting_rfq",
    label: "Encrypt RFQ Parameters",
    sublabel: "Creating FHE ciphertext accounts via Encrypt gRPC",
    icon: Lock,
    badge: "encrypt",
  },
  {
    id: "submitting_rfq",
    label: "Submit Encrypted RFQ",
    sublabel: "initialize_rfq — Solana tx confirming",
    icon: Zap,
    badge: "solana",
  },
  {
    id: "awaiting_bid",
    label: "Awaiting Sealed Bid",
    sublabel: "RFQ live — Taker submitting encrypted offer",
    icon: Radio,
    badge: "user",
  },
  {
    id: "fhe_computing",
    label: "FHE Graph Executing",
    sublabel: "Encrypt executor running match_rfq_bid circuit",
    icon: Lock,
    badge: "encrypt",
  },
  {
    id: "awaiting_decryptor",
    label: "Threshold Decryption",
    sublabel: "Encrypt decryptor revealing match result boolean",
    icon: EyeOff,
    badge: "encrypt",
  },
  {
    id: "revealing_match",
    label: "Match Decision",
    sublabel: "reveal_match — USDC transferred or refunded",
    icon: CheckCircle,
    badge: "solana",
  },
  {
    id: "awaiting_mpc_sig",
    label: "Ika 2PC-MPC Signing",
    sublabel: "dWallet network generating cross-chain authorization without a bridge",
    icon: Shield,
    badge: "ika",
  },
  {
    id: "settled",
    label: "Settlement Complete",
    sublabel: "Signature committed — foreign asset released",
    icon: ArrowRight,
    badge: "ika",
  },
];

// Map lifecycle step → step index
const STEP_ORDER: LifecycleStep[] = [
  "encrypting_rfq",
  "submitting_rfq",
  "awaiting_bid",
  "fhe_computing",
  "awaiting_decryptor",
  "revealing_match",
  "awaiting_mpc_sig",
  "settled",
];

function stepIndex(step: LifecycleStep): number {
  const idx = STEP_ORDER.indexOf(step);
  return idx === -1 ? -1 : idx;
}

// Generates a random slice of hex characters to simulate ciphertext visualization
function useRandomHex(length: number, speedMs: number, enabled: boolean) {
  const [hex, setHex] = useState("");
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      let r = "";
      for (let i = 0; i < length; i++) {
        r += Math.floor(Math.random() * 16).toString(16);
      }
      setHex(r);
    }, speedMs);
    return () => clearInterval(interval);
  }, [length, speedMs, enabled]);
  return hex;
}

interface Props {
  currentStep: LifecycleStep;
  escrowAmount?: bigint;
  matchResult?: boolean | null;
  ikaSignature?: Uint8Array | null;
  txSigs?: Record<string, string>;
}

const BADGE_STYLES = {
  encrypt: "bg-encrypt/10 text-encrypt border border-encrypt/20",
  ika:     "bg-ika/10 text-ika border border-ika/20",
  solana:  "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  user:    "bg-slate-500/10 text-slate-400 border border-slate-500/20",
};

const BADGE_LABELS = {
  encrypt: "Encrypt FHE",
  ika:     "Ika MPC",
  solana:  "Solana",
  user:    "User",
};

export const StatusStepper: FC<Props> = ({
  currentStep,
  escrowAmount,
  matchResult,
  ikaSignature,
  txSigs = {},
}: Props) => {
  const current = stepIndex(currentStep);
  const isNoMatch  = currentStep === "no_match";
  const isCancelled = currentStep === "cancelled";

  // Hex streamers simulating the cryptographic compute running in the background
  const fheComputeHex = useRandomHex(48, 80, currentStep === "fhe_computing" || currentStep === "awaiting_decryptor");
  const mpcComputeHex = useRandomHex(64, 50, currentStep === "awaiting_mpc_sig");

  return (
    <div className="flex flex-col gap-0 animate-fade-in relative overflow-hidden">
      {/* Background Matrix-style glow when computing */}
      {(currentStep === "fhe_computing" || currentStep === "awaiting_decryptor") && (
        <div className="absolute inset-0 bg-encrypt-glow/5 mix-blend-screen pointer-events-none transition-opacity duration-1000" />
      )}
      {currentStep === "awaiting_mpc_sig" && (
        <div className="absolute inset-0 bg-ika-glow/5 mix-blend-screen pointer-events-none transition-opacity duration-1000" />
      )}

      {/* Header */}
      <div className="mb-6 relative z-10">
        <h2 className="font-mono text-sm text-text tracking-widest uppercase mb-1 flex items-center gap-2">
          {current >= 5 ? <ArrowRight className="w-4 h-4 text-success" /> : <Lock className="w-4 h-4 text-encrypt" />}
          Transaction Lifecycle
        </h2>
        <p className="text-subtle text-xs">
          Order parameters remain mathematically sealed throughout execution.
        </p>
      </div>

      {/* Steps */}
      <div className="relative z-10">
        {/* Vertical connector line */}
        <div className="absolute left-5 top-6 bottom-6 w-px bg-border shadow-[0_0_10px_rgba(255,255,255,0.05)]" />

        {STEPS.map((step, idx) => {
          const isComplete  = current > idx;
          const isActive    = current === idx;
          const isPending   = current < idx;
          const isFailed    = isNoMatch && step.id === "revealing_match";

          const Icon = step.icon as any;

          return (
            <div
              key={step.id}
              className={clsx(
                "relative flex gap-4 pb-6 last:pb-0 transition-all duration-300",
                "animate-slide-up",
                { "opacity-30": isPending && !isActive },
                { "scale-[1.02] ml-1": isActive }
              )}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {/* Step indicator */}
              <div className="relative z-10 flex-shrink-0">
                {isComplete ? (
                  <div className="w-10 h-10 rounded-full bg-success/15 border border-success/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <CheckCircle className="w-5 h-5 text-success drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                  </div>
                ) : isActive ? (
                  <div
                    className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      step.badge === "encrypt"
                        ? "bg-encrypt/20 border border-encrypt/60 animate-pulse-encrypt shadow-[0_0_20px_rgba(0,210,255,0.4)]"
                        : step.badge === "ika"
                        ? "bg-ika/20 border border-ika/60 animate-pulse-ika shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                        : "bg-blue-500/20 border border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "w-5 h-5 animate-spin-slow",
                        step.badge === "encrypt" ? "text-encrypt"
                          : step.badge === "ika" ? "text-ika"
                          : "text-blue-400"
                      )}
                      style={{ animationDuration: "4s" }}
                    />
                  </div>
                ) : isFailed ? (
                  <div className="w-10 h-10 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center">
                    <Circle className="w-5 h-5 text-danger" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-panel border border-border flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted/50" />
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 pt-0.5">
                <div className="flex items-center gap-3 mb-0.5">
                  <span
                    className={clsx(
                      "font-mono text-sm font-semibold",
                      isComplete ? "text-text"
                        : isActive ? (
                            step.badge === "encrypt" ? "text-encrypt drop-shadow-[0_0_8px_rgba(0,210,255,0.8)]"
                              : step.badge === "ika" ? "text-ika drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                              : "text-blue-400"
                          )
                        : "text-muted"
                    )}
                  >
                    {step.label}
                  </span>
                  <span className={clsx("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-bold", BADGE_STYLES[step.badge])}>
                    {BADGE_LABELS[step.badge]}
                  </span>
                </div>

                <p className="text-xs text-subtle/80">{step.sublabel}</p>

                {/* Contextual info per step */}
                {isComplete && step.id === "submitting_bid" && escrowAmount != null && (
                  <div className="mt-2 px-2.5 py-1 rounded-md bg-success/10 border border-success/20 inline-flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-success" />
                    <span className="text-xs text-success font-mono">
                      Escrow locked: {(Number(escrowAmount) / 1_000_000).toFixed(2)} USDC
                    </span>
                  </div>
                )}

                {isComplete && step.id === "revealing_match" && matchResult === true && (
                  <div className="mt-2 px-2.5 py-1.5 rounded-md bg-success/10 border border-success/30 inline-flex flex-col">
                    <span className="text-xs text-success font-mono font-bold">✓ Boolean Output = 1 (Matched)</span>
                    <span className="text-[10px] text-success/70 font-mono mt-0.5">No prices exposed during resolution. Escrow unlocked.</span>
                  </div>
                )}

                {/* Enhanced Animated Decryption Visualization */}
                {isActive && (step.id === "fhe_computing" || step.id === "awaiting_decryptor") && (
                  <div className="mt-3 p-2 bg-[#040a12] border border-encrypt/20 rounded-md font-mono text-xs overflow-hidden relative group">
                    <div className="absolute inset-0 bg-encrypt-gradient opacity-10 blur-md pointer-events-none" />
                    <div className="flex items-center gap-2 mb-1 opacity-70">
                      <Lock className="w-3 h-3 text-encrypt" />
                      <span className="text-encrypt tracking-widest text-[10px]">EVALUATING GRAPH [CT + CT]</span>
                    </div>
                    <div className="tracking-widest text-encrypt/60 break-all leading-tight">
                      0x{fheComputeHex || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b9"}
                    </div>
                  </div>
                )}

                {/* Enhanced Animated MPC Visualization */}
                {isActive && step.id === "awaiting_mpc_sig" && (
                  <div className="mt-3 p-2 bg-[#0a0512] border border-ika/20 rounded-md font-mono text-xs overflow-hidden relative">
                     <div className="absolute inset-0 bg-ika-gradient opacity-10 blur-md pointer-events-none" />
                     <div className="flex items-center gap-2 mb-1 opacity-70">
                      <Shield className="w-3 h-3 text-ika" />
                      <span className="text-ika tracking-widest text-[10px]">M-of-N GEN SECP256K1 SIG</span>
                    </div>
                    <div className="tracking-widest text-ika/60 break-all leading-tight">
                      0x{mpcComputeHex || "3e0c028a2b53b76a6ceb7a3cc7bb3d5c6af0e012fa8d52c1e"}
                    </div>
                  </div>
                )}

                {isComplete && step.id === "settled" && ikaSignature && (
                  <div className="mt-3 p-2.5 rounded-lg bg-ika/10 border border-ika/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle className="w-3 h-3 text-ika" />
                      <p className="text-xs text-ika font-mono font-bold tracking-wide">Public Settlement Payload:</p>
                    </div>
                    <p className="text-xs text-subtle font-mono break-all leading-relaxed bg-[#000]/30 p-1.5 rounded">
                      {Array.from(ikaSignature).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 64)}…
                    </p>
                  </div>
                )}

                {txSigs[step.id] && (
                  <a
                    href={`https://explorer.solana.com/tx/${txSigs[step.id]}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-[11px] text-muted hover:text-encrypt transition-colors flex items-center gap-1 font-mono hover:underline"
                  >
                    View TX on Solana Explorer ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal states */}
      {isNoMatch && (
        <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/30 animate-slide-up shadow-[0_0_20px_rgba(245,158,11,0.15)] relative">
          <div className="absolute top-0 right-0 p-3 opacity-20"><EyeOff className="w-16 h-16 text-warning" /></div>
          <p className="text-warning font-mono text-sm font-bold mb-1 flex items-center gap-2">
            <Radio className="w-4 h-4" /> No Match — Output = 0
          </p>
          <p className="text-xs text-subtle/90 max-w-[90%] leading-relaxed">
            The FHE circuit determined the encrypted bid did not satisfy the Maker's encrypted conditions.
            No prices were leaked. Your {escrowAmount ? `${(Number(escrowAmount) / 1_000_000).toFixed(2)} USDC` : "escrow"}
            &nbsp;has been securely refunded via the smart contract.
          </p>
        </div>
      )}
    </div>
  );
};
