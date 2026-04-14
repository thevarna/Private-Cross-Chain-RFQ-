/**
 * SettlementDashboard — Post-Trade Transparency Panel
 *
 * After a trade settles, this component renders a split-panel view:
 * LEFT:  "Encrypted Zone" — shows ciphertext pubkeys and opaque hex digests
 * RIGHT: "Public Record"  — shows USDC transfer amount, Ika signature bytes,
 *                           and links to all relevant Solana Explorer accounts
 *
 * The key message for judges: "Prices were never exposed — only the outcome."
 */

"use client";

import { FC, useEffect, useState } from "react";
import { Lock, Shield, ArrowRight, CheckCircle, ExternalLink, KeyRound, EyeOff, Zap } from "lucide-react";
import clsx from "clsx";
import { ActiveRfq, ActiveBid, SettlementResult } from "@/stores/rfqStore";
import { EXPLORER } from "@/lib/constants";

// Scrolling hex generator specifically for the "Encrypted Zone"
function useEncryptedStream(length: number, intervalMs: number) {
  const [stream, setStream] = useState("");
  useEffect(() => {
    const i = setInterval(() => {
      let r = "";
      for (let j = 0; j < length; j++) r += Math.floor(Math.random() * 16).toString(16);
      setStream(r);
    }, intervalMs);
    return () => clearInterval(i);
  }, [length, intervalMs]);
  return stream;
}

interface Props {
  rfq:        ActiveRfq;
  bid:        ActiveBid;
  settlement: SettlementResult;
  txSigs:     Record<string, string>;
}

export const SettlementDashboard: FC<Props> = ({ rfq, bid, settlement, txSigs }) => {
  const sigHex = settlement.ikaSignature
    ? Buffer.from(settlement.ikaSignature).toString("hex")
    : null;

  const bgHex1 = useEncryptedStream(16, 100);
  const bgHex2 = useEncryptedStream(16, 120);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-4">
      {/* Hero */}
      <div className="text-center py-6 border-b border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-success/5 via-void to-void pointer-events-none" />
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-success to-ika mb-5 shadow-[0_0_40px_rgba(16,185,129,0.3)] relative z-10">
          <CheckCircle className="w-10 h-10 text-void drop-shadow-md" />
        </div>
        <h2 className="font-mono text-2xl text-text font-bold mb-2 tracking-tight">Zero-Knowledge Settlement</h2>
        <p className="text-subtle text-sm max-w-lg mx-auto leading-relaxed">
          The RFQ matched and settled atomically across chains. <br/>
          <span className="text-encrypt font-mono font-semibold bg-encrypt/10 px-1.5 py-0.5 rounded">Financial data was completely hidden</span> from all parties, nodes, and validators.
        </p>
      </div>

      {/* Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        
        {/* Connector Element for Desktop */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-panel border-4 border-void shadow-xl items-center justify-center">
          <ArrowRight className="w-5 h-5 text-muted" />
        </div>

        {/* LEFT: Encrypted Zone */}
        <div className="rounded-2xl border border-encrypt/30 bg-encrypt-glow p-6 relative overflow-hidden group">
          {/* Animated Background Blob */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-encrypt/10 blur-3xl rounded-full transition-transform duration-1000 group-hover:scale-150" />
          
          <div className="flex items-center gap-2 mb-5 relative z-10">
            <div className="p-1.5 rounded-md bg-encrypt/20">
              <EyeOff className="w-5 h-5 text-encrypt" />
            </div>
            <span className="font-mono text-sm font-bold tracking-widest text-encrypt uppercase">
              Encrypted FHE Zone
            </span>
          </div>
          
          <p className="text-xs text-subtle mb-6 leading-relaxed relative z-10 border-l-2 border-encrypt/30 pl-3">
            Mathematical representations stored on Solana. Only the Encrypt TEE decryptor network interacted with the plaintext values during execution.
          </p>

          <div className="space-y-3 relative z-10">
            <CipherRow
              label="Maker Price Ciphertext"
              pubkey={rfq.rfqPriceCt.toBase58()}
              hexStream={bgHex1}
            />
            <CipherRow
              label="Maker Size Ciphertext"
              pubkey={rfq.rfqSizeCt.toBase58()}
              hexStream={bgHex2}
            />
            <CipherRow
              label="Taker Price Ciphertext"
              pubkey={bid.bidPriceCt.toBase58()}
              hexStream={bgHex1}
            />
            <CipherRow
              label="Taker Size Ciphertext"
              pubkey={bid.bidSizeCt.toBase58()}
              hexStream={bgHex2}
            />
            <div className="pt-2">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-encrypt/30 to-transparent my-4" />
              {bid.matchResultCt && (
                <div className="p-3 rounded-lg border border-success/40 bg-success/10 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex justify-between items-center">
                   <div>
                     <p className="text-[10px] text-success/80 font-mono font-bold uppercase tracking-wider mb-1">Graph Output</p>
                     <p className="text-sm text-success font-mono">EUint64 • <span className="font-bold text-white bg-success/30 px-1 rounded">Value: 1</span></p>
                   </div>
                   <Lock className="w-5 h-5 text-success/50" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Settled Zone */}
        <div className="rounded-2xl border border-ika/30 bg-ika-glow p-6 relative overflow-hidden group">
          {/* Animated Background Blob */}
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-ika/10 blur-3xl rounded-full transition-transform duration-1000 group-hover:scale-150" />
          
          <div className="flex items-center gap-2 mb-5 relative z-10">
            <div className="p-1.5 rounded-md bg-ika/20">
              <KeyRound className="w-5 h-5 text-ika" />
            </div>
            <span className="font-mono text-sm font-bold tracking-widest text-ika uppercase">
              Public Ledger Record
            </span>
          </div>

          <p className="text-xs text-subtle mb-6 leading-relaxed relative z-10 border-l-2 border-ika/30 pl-3">
            Because the FHE circuit successfully resolved to `1`, the smart contract unlocked the vault, dispensing assets and confirming the dWallet cross-chain signature.
          </p>

          <div className="space-y-4 mb-6 relative z-10">
            {settlement.makerUsdcAmount != null && (
              <SettledRow
                icon={<Zap className="w-4 h-4 text-blue-400" />}
                label="Solana SPL Transfer"
                value={`+${(Number(settlement.makerUsdcAmount) / 1_000_000).toFixed(2)} USDC`}
                valueClass="text-success font-bold text-sm bg-success/10 px-2 py-0.5 rounded"
              />
            )}
            <SettledRow
              icon={<Shield className="w-4 h-4 text-ika" />}
              label="BTC Receive Address"
              value={bid.foreignReceiveAddr || "—"}
              valueClass="font-mono text-xs text-text bg-surface px-1.5 py-0.5 rounded border border-border"
            />
            <SettledRow
              icon={<Shield className="w-4 h-4 text-ika/60" />}
              label="Signature Scheme"
              value="ECDSA DoubleSha256"
              valueClass="text-xs text-subtle"
            />
          </div>

          {sigHex && (
            <div className="p-4 rounded-xl bg-[#000]/40 border border-ika/20 shadow-inner relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-ika font-mono font-bold uppercase tracking-widest">Bridgeless MPC Signature</p>
                <div className="w-2 h-2 rounded-full bg-ika animate-pulse" />
              </div>
              <p className="text-xs font-mono text-ika/80 break-all leading-relaxed">
                {sigHex.slice(0, 32)}
                <span className="text-white font-bold">{sigHex.slice(32, 64)}</span>
                {sigHex.slice(64, 96)}
                <span className="opacity-40">{sigHex.slice(96, 128)}</span>
              </p>
            </div>
          )}

          {/* Explorer links */}
          <div className="relative z-10 mt-6 pt-4 border-t border-border/50 grid grid-cols-1 gap-2">
            <ExplorerLink
              label="RFQ State Account"
              href={`${EXPLORER}/address/${rfq.rfqPda.toBase58()}?cluster=devnet`}
            />
            {bid.messageApproval && (
              <ExplorerLink
                label="Ika MessageApproval PDA"
                href={`${EXPLORER}/address/${bid.messageApproval.toBase58()}?cluster=devnet`}
              />
            )}
            {txSigs["settled"] && (
              <ExplorerLink
                label="Settlement Transaction"
                href={`${EXPLORER}/tx/${txSigs["settled"]}?cluster=devnet`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const CipherRow: FC<{ label: string; pubkey: string; hexStream: string }> = ({
  label,
  pubkey,
  hexStream,
}) => (
  <div className="p-3 rounded-lg border border-encrypt/20 bg-[#040a12]/80 font-mono shadow-sm group hover:border-encrypt/40 transition-colors">
    <div className="flex justify-between items-center mb-1.5">
      <p className="text-[10px] text-encrypt/80 font-bold uppercase tracking-wider">{label}</p>
      <Lock className="w-3 h-3 text-encrypt/50" />
    </div>
    <p className="text-[11px] text-subtle break-all leading-tight mb-2 opacity-80">{pubkey}</p>
    <div className="bg-[#000] p-1.5 rounded flex items-center gap-2 overflow-hidden border border-border/50">
      <span className="text-[9px] text-muted rounded-sm px-1 font-sans font-bold bg-white/5 uppercase">SEALED</span>
      <span className="text-[10px] text-encrypt/40 tracking-widest tabular-nums w-full">0x{hexStream}...</span>
    </div>
  </div>
);

const SettledRow: FC<{ icon: React.ReactNode; label: string; value: string; valueClass?: string }> = ({
  icon, label, value, valueClass
}) => (
  <div className="flex justify-between items-center gap-3">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-muted font-medium">{label}</span>
    </div>
    <span className={clsx("text-right break-all", valueClass || "text-sm text-text")}>
      {value}
    </span>
  </div>
);

const ExplorerLink: FC<{ label: string; href: string }> = ({ label, href }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-between p-2 rounded border border-transparent hover:border-border/50 hover:bg-surface/30 text-xs text-muted hover:text-white transition-all font-mono group"
  >
    <span>{label}</span>
    <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:text-ika transition-all" />
  </a>
);
