"use client";

import nextDynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { Shield, Lock, Zap, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const OrderBook = nextDynamic(() => import("@/components/OrderBook").then(m => m.OrderBook), { ssr: false });

export const dynamic = "force-dynamic";

export default function TradeDesk() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { publicKey } = useWallet();

  if (!mounted) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-match-gradient opacity-20" />
        </div>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="h-full min-h-[500px] flex items-center justify-center">
        <div className="text-center max-w-sm animate-fade-in glass-card p-10">
          <div className="w-20 h-20 mx-auto mb-8 rounded-[2rem] bg-match-gradient flex items-center justify-center shadow-2xl shadow-encrypt/10 rotate-3">
            <Lock className="w-10 h-10 text-void shrink-0" />
          </div>
          <h1 className="text-2xl font-mono text-text font-bold mb-4 tracking-tight">
            Connect Wallet
          </h1>
          <p className="text-sm text-subtle mb-10 leading-6 px-4">
            Connect your Solana wallet to access the Private RFQ Desk and begin trading with zero-knowledge.
          </p>
          <div className="flex justify-center scale-110">
            <WalletMultiButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-8 h-full">
      {/* LEFT COLUMN: Info Cards & Maker Action */}
      <aside className="col-span-12 lg:col-span-4 flex flex-col gap-6">
        <section className="glass-card p-6 shadow-2xl">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-mono text-lg font-bold text-text mb-1">Make a Market</h2>
              <p className="text-xs text-subtle">
                Create a new sealed-bid RFQ. Your price and size will be encrypted and hidden from the public orderbook.
              </p>
            </div>
            <Link 
              href="/trade/create"
              className="w-full py-4 px-5 rounded-xl font-mono text-sm font-bold bg-encrypt-gradient text-void transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_20px_rgba(0,210,255,0.3)] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New RFQ
            </Link>
          </div>
        </section>

        <section className="glass-card p-5 space-y-4 shadow-xl">
          <p className="label">Execution Engine</p>
          <StatRow icon={<Lock className="w-3.5 h-3.5 text-encrypt shrink-0" />} label="FHE Runtime" value="A-Star" ok />
          <StatRow icon={<Shield className="w-3.5 h-3.5 text-ika shrink-0" />} label="MPC Nodes" value="Stable (8)" ok />
          <StatRow icon={<Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />} label="Solana TPS" value="2.4k" ok />
        </section>

        <section className="glass-card p-5 border-warning/10 bg-warning/[0.02] shadow-xl">
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

      {/* RIGHT COLUMN: Orderbook (Taker Action) */}
      <main className="col-span-12 lg:col-span-8 flex flex-col min-h-[600px]">
        <div className="glass-card p-1 shadow-2xl flex-1 flex flex-col">
          <div className="p-1 rounded-[calc(1rem-1px)] flex-1">
            {/* The OrderBook component will need to be slightly modified to not use fixed height and absolute positioning so it flows nicely here */}
            <OrderBook />
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
