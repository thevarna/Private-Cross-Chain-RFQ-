"use client";

import nextDynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { Shield, Lock, Zap, ChevronRight } from "lucide-react";
import clsx from "clsx";

import { useRfqStore }        from "@/stores/rfqStore";

// Move components to lazy-loaded dynamic imports with SSR: false
const RfqCreationForm = nextDynamic(() => import("@/components/RfqCreationForm").then(m => m.RfqCreationForm), { ssr: false });
const StatusStepper   = nextDynamic(() => import("@/components/StatusStepper").then(m => m.StatusStepper), { ssr: false });
const OrderBook       = nextDynamic(() => import("@/components/OrderBook").then(m => m.OrderBook), { ssr: false });
const SettlementDashboard = nextDynamic(() => import("@/components/SettlementDashboard").then(m => m.SettlementDashboard), { ssr: false });

export const dynamic = "force-dynamic";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { publicKey } = useWallet();
  const {
    role, setRole,
    step, activeRfq, activeBid, settlement, txSigs, error,
  } = useRfqStore();

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-match-gradient opacity-20" />
          <div className="h-2 w-24 bg-border rounded" />
        </div>
      </div>
    );
  }

  const showStepper     = step !== "idle" && step !== "awaiting_bid";
  const showSettlement  = (step === "settled" || step === "no_match") && settlement;
  const showRfqForm     = role === "maker" && step === "idle";

  return (
    <div className="min-h-screen flex flex-col bg-void bg-grid-pattern bg-[size:40px_40px]">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-void/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4 max-w-[1440px] mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-match-gradient flex items-center justify-center shadow-lg shadow-encrypt/10 overflow-hidden">
              <Lock className="w-5 h-5 text-void shrink-0" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-base font-bold text-text tracking-tight uppercase">
                Private RFQ Desk
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-encrypt font-mono font-bold tracking-widest uppercase">Encrypt</span>
                <span className="text-[10px] text-muted">×</span>
                <span className="text-[10px] text-ika font-mono font-bold tracking-widest uppercase">Ika</span>
                <span className="text-[10px] text-muted px-1 opacity-50">|</span>
                <span className="text-[10px] text-muted font-mono uppercase tracking-tighter">Devnet 3.1.10</span>
              </div>
            </div>
          </div>

          {/* Sponsor badges */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-encrypt/5 border border-encrypt/20 backdrop-blur-md">
              <Lock className="w-3.5 h-3.5 text-encrypt shrink-0" />
              <span className="text-[11px] text-encrypt font-mono font-semibold tracking-wider">REFHE CLOUD ACTIVE</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-ika/5 border border-ika/20 backdrop-blur-md">
              <Shield className="w-3.5 h-3.5 text-ika shrink-0" />
              <span className="text-[11px] text-ika font-mono font-semibold tracking-wider">2PC-MPC CLUSTER READY</span>
            </div>
          </div>

          {/* Wallet */}
          <div className="flex items-center gap-4">
             <div className="hidden sm:block h-8 w-px bg-border mx-2" />
             <WalletMultiButton />
          </div>
        </div>
      </header>

      {/* ── Main 12-Column Grid Layout ─────────────────────────────────────────── */}
      <div className="flex-1 max-w-[1440px] mx-auto w-full px-6 py-8 grid grid-cols-12 gap-8">

        {/* LEFT COMPONENT (3 cols) */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-6 order-2 lg:order-1">
          <section className="glass-card p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <p className="label">Network Partition</p>
              <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <RoleButton
                id="role-maker"
                label="Maker"
                sublabel="Sell BTC"
                active={role === "maker"}
                onClick={() => setRole("maker")}
                color="encrypt"
              />
              <RoleButton
                id="role-taker"
                label="Taker"
                sublabel="Buy BTC"
                active={role === "taker"}
                onClick={() => setRole("taker")}
                color="ika"
              />
            </div>
          </section>

          <section className="glass-card p-5 space-y-4">
            <p className="label">Execution Engine</p>
            <StatRow icon={<Lock className="w-3.5 h-3.5 text-encrypt shrink-0" />}
              label="FHE Runtime" value="A-Star" ok />
            <StatRow icon={<Shield className="w-3.5 h-3.5 text-ika shrink-0" />}
              label="MPC Nodes" value="Stable (8)" ok />
            <StatRow icon={<Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
              label="Solana TPS" value="2.4k" ok />
          </section>

          <section className="glass-card p-5 border-warning/10 bg-warning/[0.02]">
            <div className="flex items-center gap-2 mb-2 text-warning">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest">Compliance Notice</p>
            </div>
            <p className="text-[11px] text-subtle leading-normal font-medium opacity-80">
              This environment utilizes mock FHE/MPC providers for the demonstration. 
              Production security parameters activate on Solana Mainnet transitions.
            </p>
          </section>
        </aside>

        {/* CENTER COMPONENT (6 cols) */}
        <main className="col-span-12 lg:col-span-6 min-w-0 order-1 lg:order-2">
          {!publicKey ? (
            <div className="h-full min-h-[500px] flex items-center justify-center">
              <div className="text-center max-w-sm animate-fade-in">
                <div className="w-20 h-20 mx-auto mb-8 rounded-[2rem] bg-match-gradient flex items-center justify-center shadow-2xl shadow-encrypt/10 rotate-3">
                  <Lock className="w-10 h-10 text-void shrink-0" />
                </div>
                <h1 className="text-2xl font-mono text-text font-bold mb-4 tracking-tight">
                  Confidential Liquidity
                </h1>
                <p className="text-sm text-subtle mb-10 leading-6 px-4">
                  Experience institutional-grade OTC settlements without revealing price intent. 
                  Locked by <span className="text-encrypt font-semibold">Encrypt REFHE</span> infrastructure.
                </p>
                <div className="scale-110">
                  <WalletMultiButton />
                </div>
              </div>
            </div>
          ) : showSettlement && activeRfq && activeBid ? (
            <div className="glass-card p-1 shadow-2xl animate-slide-up">
              <div className="p-1 rounded-[calc(1rem-1px)] border border-white/[0.03]">
                <SettlementDashboard
                  rfq={activeRfq}
                  bid={activeBid}
                  settlement={settlement!}
                  txSigs={txSigs}
                />
              </div>
            </div>
          ) : showStepper ? (
            <div className="glass-card p-8 shadow-2xl animate-fade-in">
              <StatusStepper
                currentStep={step}
                escrowAmount={activeBid?.escrowAmount}
                ikaSignature={settlement?.ikaSignature ?? null}
                txSigs={txSigs}
              />
            </div>
          ) : showRfqForm ? (
            <div className="glass-card p-8 shadow-2xl animate-slide-up bg-void/40">
              <RfqCreationForm />
            </div>
          ) : role === "taker" ? (
            <div className="glass-card p-8 flex items-center justify-center min-h-[400px] border-dashed border-muted/20">
              <div className="text-center">
                <div className="w-12 h-12 bg-muted/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ChevronRight className="w-6 h-6 text-muted shrink-0" />
                </div>
                <p className="font-mono text-sm font-semibold text-muted tracking-tight mb-2">
                  Select Order for Matching
                </p>
                <p className="text-xs text-subtle max-w-[240px] mx-auto opacity-60">
                  Review the live RFQ desk on the right and select "Place Bid" to initialize matching.
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 flex items-center justify-center min-h-[400px]">
              <div className="text-center group">
                <div className="w-12 h-12 bg-encrypt/5 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-encrypt/10 transition-colors">
                  <Lock className="w-6 h-6 text-muted shrink-0 group-hover:text-encrypt transition-colors" />
                </div>
                <p className="font-mono text-sm font-semibold text-muted tracking-tight mb-2">
                  Console Standby
                </p>
                <p className="text-xs text-subtle opacity-60">
                  Select "Maker" or "Taker" to initialize session
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 rounded-2xl bg-danger/5 border border-danger/20 animate-slide-up flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-danger animate-ping" />
              <p className="text-xs text-danger font-mono font-medium">{error}</p>
            </div>
          )}
        </main>

        {/* RIGHT COMPONENT (3 cols) */}
        <aside className="col-span-12 lg:col-span-3 order-3">
          <div className="glass-card p-1 sticky top-28 shadow-xl">
             <div className="p-1 rounded-[calc(1rem-1px)]">
                <OrderBook />
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const RoleButton: React.FC<{
  id: string;
  label: string;
  sublabel: string;
  active: boolean;
  onClick: () => void;
  color: "encrypt" | "ika";
}> = ({ id, label, sublabel, active, onClick, color }) => (
  <button
    id={id}
    onClick={onClick}
    className={clsx(
       "flex flex-col items-center py-3 px-2 rounded-lg border transition-all duration-200 text-center",
      active
        ? color === "encrypt"
          ? "border-encrypt/40 bg-encrypt/10 text-encrypt"
          : "border-ika/40 bg-ika/10 text-ika"
        : "border-border bg-surface/50 text-muted hover:border-border/80 hover:text-subtle"
    )}
  >
    <span className="font-mono text-sm font-medium">{label}</span>
    <span className="text-xs opacity-70">{sublabel}</span>
  </button>
);

const StatRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  ok?: boolean;
}> = ({ icon, label, value, ok }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-muted">{label}</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className={clsx("w-1.5 h-1.5 rounded-full", ok ? "bg-success" : "bg-danger")} />
      <span className="text-xs font-mono text-text">{value}</span>
    </div>
  </div>
);
