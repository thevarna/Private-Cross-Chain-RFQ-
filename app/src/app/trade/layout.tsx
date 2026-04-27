"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Shield, Lock } from "lucide-react";
import Link from "next/link";

export default function TradeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-void bg-grid-pattern bg-[size:40px_40px]">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-void/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4 max-w-[1440px] mx-auto w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
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
          </Link>

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

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="flex-1 max-w-[1440px] mx-auto w-full px-6 py-8">
        {children}
      </div>
    </div>
  );
}
