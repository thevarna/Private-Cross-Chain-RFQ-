"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { RfqCreationForm } from "@/components/RfqCreationForm";

export default function CreateRfqPage() {
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8 h-full animate-fade-in pb-12">
      <Link 
        href="/trade" 
        className="inline-flex items-center gap-2 text-sm font-mono text-muted hover:text-text transition-colors w-fit"
      >
        <div className="w-8 h-8 rounded-full bg-panel border border-border flex items-center justify-center group-hover:bg-surface transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </div>
        Back to Live Desk
      </Link>

      <div className="glass-card p-10 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-encrypt/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          <RfqCreationForm />
        </div>
      </div>
    </div>
  );
}
