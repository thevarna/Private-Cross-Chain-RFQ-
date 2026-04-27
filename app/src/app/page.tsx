"use client";

import { useState, useEffect } from "react";
import { Lock, Shield, Zap, ArrowRight, Activity, Globe } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col bg-void bg-grid-pattern bg-[size:40px_40px] relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-encrypt/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-ika/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <header className="absolute top-0 w-full z-50">
        <div className="flex items-center justify-between px-8 py-6 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-match-gradient flex items-center justify-center shadow-lg shadow-encrypt/10">
              <Lock className="w-5 h-5 text-void shrink-0" />
            </div>
            <span className="font-mono text-lg font-bold text-text tracking-tight uppercase">
              Private RFQ Desk
            </span>
          </div>
          
          <Link 
            href="/trade"
            className="px-6 py-2.5 rounded-full font-mono text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md text-text flex items-center gap-2 group"
          >
            Launch App
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pt-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-encrypt/10 border border-encrypt/20 backdrop-blur-md mb-8 animate-fade-in">
            <Lock className="w-3.5 h-3.5 text-encrypt" />
            <span className="text-xs text-encrypt font-mono font-semibold tracking-wider uppercase">
              Powered by Encrypt FHE & Ika MPC
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-mono font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40 tracking-tighter mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            Confidential <br /> Cross-Chain Liquidity
          </h1>
          
          <p className="text-lg md:text-xl text-subtle font-medium max-w-2xl mx-auto mb-12 animate-slide-up leading-relaxed" style={{ animationDelay: '200ms' }}>
            Execute massive OTC trades without market impact. Price and size are mathematically sealed throughout the entire matching process. No bridges. No front-running.
          </p>
          
          <div className="flex items-center justify-center gap-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <Link 
              href="/trade"
              className="px-8 py-4 rounded-xl font-mono text-base font-bold bg-encrypt-gradient text-void hover:brightness-110 hover:shadow-[0_0_30px_rgba(0,210,255,0.4)] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              Enter Live Desk
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-24 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <FeatureCard 
            icon={<Lock className="w-6 h-6 text-encrypt" />}
            title="Fully Homomorphic Encryption"
            description="Orders are matched mathematically while encrypted. Neither the network, the validators, nor the counterparty sees the parameters until settlement."
          />
          <FeatureCard 
            icon={<Shield className="w-6 h-6 text-ika" />}
            title="Bridgeless 2PC-MPC Settlement"
            description="Native assets (like Bitcoin) are released cross-chain using multi-party computation signatures. Zero wrap risk."
          />
          <FeatureCard 
            icon={<Zap className="w-6 h-6 text-blue-400" />}
            title="Solana Speed & Finality"
            description="The entire state machine is orchestrated on Solana, providing unparalleled throughput and instant consensus for the RFQ lifecycle."
          />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-8 text-center text-xs font-mono text-muted relative z-10 border-t border-white/5 mt-20">
        <p>Built for the Encrypt x Ika Frontier Hackathon</p>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="glass-card p-6 flex flex-col items-start text-left hover:-translate-y-1 transition-transform duration-300">
    <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center border border-border mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-mono font-bold text-text mb-2">{title}</h3>
    <p className="text-sm text-subtle leading-relaxed">{description}</p>
  </div>
);
