/**
 * OrderBook — Live RFQ Feed
 *
 * Fetches active RFQs from the relayer API (/api/rfqs/active) and renders
 * each as a row with status badge, chain identifier, and bid action.
 *
 * Note: No price or size data appears here (they're encrypted on-chain).
 * Only RFQ IDs, chain type, status badges, and creation timestamps are shown.
 */

"use client";

import { FC, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { Radio, Bitcoin, Cpu, CheckCircle, Clock } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { useRfqStore } from "@/stores/rfqStore";
import { RELAYER_API, RFQ_STATUS, CHAIN_ID } from "@/lib/constants";

interface RelayerRfq {
  rfq_pubkey:   string;
  maker_pubkey: string;
  status:       number;
  chain:        number;
  created_at:   string;
}

const STATUS_BADGE: Record<number, { label: string; cls: string }> = {
  [RFQ_STATUS.ACTIVE]:    { label: "Active",    cls: "text-success bg-success/10 border-success/20" },
  [RFQ_STATUS.COMPUTING]: { label: "Computing", cls: "text-encrypt bg-encrypt/10 border-encrypt/20" },
  [RFQ_STATUS.MATCHED]:   { label: "Matched",   cls: "text-ika bg-ika/10 border-ika/20" },
  [RFQ_STATUS.SETTLED]:   { label: "Settled",   cls: "text-muted bg-muted/10 border-muted/20" },
  [RFQ_STATUS.CANCELLED]: { label: "Cancelled", cls: "text-danger bg-danger/10 border-danger/20" },
};

export const OrderBook: FC = () => {
  const { setActiveRfq } = useRfqStore();

  const { data, isLoading, isError } = useQuery<RelayerRfq[]>({
    queryKey: ["rfqs-active"],
    queryFn: async () => {
      const res = await fetch(`${RELAYER_API}/api/rfqs/active`);
      if (!res.ok) throw new Error(`Relayer error ${res.status}`);
      const json = await res.json();
      return json.data ?? [];
    },
    refetchInterval: 3000,
  });
  const handleSelectRfq = (rfq: RelayerRfq) => {
    // We populate the store with a minimal ActiveRfq so the details page 
    // doesn't have to guess or fetch dummy accounts.
    const activeRfq = {
      rfqPda:            new PublicKey(rfq.rfq_pubkey),
      rfqPriceCt:        new PublicKey(rfq.rfq_pubkey),  // placeholder
      rfqSizeCt:         new PublicKey(rfq.rfq_pubkey),  // placeholder
      dwalletPubkey:     new PublicKey(rfq.maker_pubkey),
      foreignAssetChain: rfq.chain,
      salt:              new Uint8Array(32),
      makerPubkey:       new PublicKey(rfq.maker_pubkey),
    };
    setActiveRfq(activeRfq);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-encrypt shrink-0" />
            <h2 className="font-mono text-sm text-encrypt tracking-widest uppercase">
              Live RFQ Desk
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-success font-mono">Devnet</span>
          </div>
        </div>

        {/* Privacy note */}
        <p className="text-xs text-muted">
          Price and size parameters are sealed with FHE. Only the RFQ ID, chain, and
          status are publicly visible.
        </p>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-4 px-4 py-2.5 bg-surface border-b border-border">
            {["RFQ ID", "Chain", "Status", "Action"].map((h) => (
              <span key={h} className="text-xs text-muted font-mono uppercase tracking-wider">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="px-4 py-8 text-center text-xs text-muted font-mono animate-pulse">
              Syncing from Solana…
            </div>
          ) : isError ? (
            <div className="px-4 py-8 text-center text-xs text-danger font-mono">
              Relayer unavailable — start `npm run dev:relayer`
            </div>
          ) : (data ?? []).length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted font-mono">
              No active RFQs — create one as a Maker to get started
            </div>
          ) : (
            (data ?? []).map((rfq, i) => {
              const badge  = STATUS_BADGE[rfq.status] ?? STATUS_BADGE[RFQ_STATUS.ACTIVE];
              const isActive = rfq.status === RFQ_STATUS.ACTIVE;

              return (
                <div
                  key={rfq.rfq_pubkey}
                  className={clsx(
                    "grid grid-cols-4 px-4 py-3.5 border-b border-border last:border-0",
                    "hover:bg-white/[0.02] transition-colors",
                    isActive && "bg-encrypt-glow/30"
                  )}
                >
                  {/* RFQ ID */}
                  <div className="flex flex-col">
                    <span className="text-xs font-mono text-text">
                      {rfq.rfq_pubkey.slice(0, 8)}…
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(rfq.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Chain */}
                  <div className="flex items-center gap-1.5">
                    <Bitcoin className="w-4 h-4 text-warning shrink-0" />
                    <span className="text-xs text-text font-mono">
                      {rfq.chain === CHAIN_ID.BITCOIN ? "BTC" : "ETH"}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      className={clsx(
                        "text-xs px-2 py-0.5 rounded border font-mono",
                        badge.cls
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Action */}
                  <div>
                    {isActive ? (
                      <Link
                        href={`/trade/${rfq.rfq_pubkey}`}
                        id={`place-bid-${rfq.rfq_pubkey.slice(0, 6)}`}
                        onClick={() => handleSelectRfq(rfq)}
                        className={clsx(
                          "text-xs font-mono px-3 py-1.5 rounded-lg",
                          "bg-encrypt-gradient text-void",
                          "hover:brightness-110 transition-all active:scale-95 inline-block text-center"
                        )}
                      >
                        Place Bid
                      </Link>
                    ) : (
                      <span className="text-xs text-muted font-mono">—</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </>
  );
};
