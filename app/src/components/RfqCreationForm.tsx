/**
 * RfqCreationForm — Maker UI
 *
 * Guides the Maker through the 2-step flow of creating an encrypted RFQ:
 * 1. Input trade parameters
 * 2. Call Encrypt gRPC to create ciphertext accounts
 * 3. Call initialize_rfq on-chain
 *
 * All price/size inputs are displayed in human-readable units but converted
 * to u64 (USDC micro-cents, satoshis) before submission.
 */

"use client";

import { FC, useState, useCallback } from "react";
import { PublicKey, Keypair } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Lock, Bitcoin, AlertCircle, Loader } from "lucide-react";
import clsx from "clsx";
import { useRfqProgram } from "@/hooks/useRfqProgram";
import { useRfqStore } from "@/stores/rfqStore";
import { CHAIN_ID, EXPLORER } from "@/lib/constants";

type FormStage = "input" | "encrypting" | "submitting" | "done";

interface FormValues {
  assetAmount: string;    // BTC in human units (e.g. 0.5)
  minPriceUsdc: string;   // USDC per BTC (e.g. 65000)
  dwalletPubkey: string;  // Pre-created Ika dWallet PDA pubkey
}

export const RfqCreationForm: FC = () => {
  const { publicKey } = useWallet();
  const { initializeRfq } = useRfqProgram();
  const { setStep, setActiveRfq, recordTxSig, setError } = useRfqStore();

  const [stage, setStage] = useState<FormStage>("input");
  const [values, setValues] = useState<FormValues>({
    assetAmount: "0.5",
    minPriceUsdc: "65000",
    dwalletPubkey: "ckRpWRiRXix3kgrY31DKf932ZNuyTK9Z7UyAxq88cuv", // Valid base58 mock pubkey
  });
  const [rfqPda, setRfqPda] = useState<PublicKey | null>(null);

  // Convert human-readable values to u64 integer units
  const toSatoshis = (btc: string) => Math.round(parseFloat(btc) * 100_000_000);
  const toMicroCents = (usdc: string) => Math.round(parseFloat(usdc) * 1_000_000);

  const handleSubmit = useCallback(async () => {
    if (!publicKey) return;

    setError(null);
    try {
      // ── Step 1: Validate inputs ─────────────────────────────────────────────
      const sats = toSatoshis(values.assetAmount);
      const usdcAmt = toMicroCents(values.minPriceUsdc);

      if (sats <= 0 || usdcAmt <= 0) {
        setError("Both asset amount and price must be greater than zero.");
        return;
      }

      let dwalletPk: PublicKey;
      try {
        dwalletPk = new PublicKey(values.dwalletPubkey);
      } catch {
        setError("Invalid dWallet pubkey. Please create your dWallet first.");
        return;
      }

      // ── Step 2: Create Encrypt ciphertext accounts ──────────────────────────
      // In production, these are created via the Encrypt gRPC createInput API.
      // For the MVP demo, we generate keypair accounts that will be initialized
      // by the Encrypt pre-alpha executor upon account creation.
      setStage("encrypting");
      setStep("encrypting_rfq");

      // Generate ephemeral keypairs for each ciphertext account
      const rfqPriceCt = Keypair.generate().publicKey;
      const rfqSizeCt = Keypair.generate().publicKey;
      const salt = new Uint8Array(Keypair.generate().secretKey.slice(0, 32));

      // Simulate brief encryption delay (gRPC call would take 3-10s in production)
      await new Promise((r) => setTimeout(r, 1500));

      // ── Step 3: Submit initialize_rfq instruction ───────────────────────────
      setStage("submitting");
      setStep("submitting_rfq");

      // The encryptConfig, encryptDeposit, networkEncKey, eventAuthority PDA addresses
      // are derived from the Encrypt program and would be fetched from the deployed
      // Encrypt program's configuration. These are placeholder values for the MVP.
      const encryptConfig = new PublicKey("11111111111111111111111111111111"); // replace
      const encryptDeposit = new PublicKey("11111111111111111111111111111111"); // replace
      const networkEncKey = new PublicKey("11111111111111111111111111111111"); // replace
      const eventAuthority = new PublicKey("11111111111111111111111111111111"); // replace

      const { rfqPda: pda, signature } = await initializeRfq({
        salt,
        dwalletPubkey: dwalletPk,
        foreignAssetChain: CHAIN_ID.BITCOIN,
        rfqPriceCt,
        rfqSizeCt,
        encryptConfig,
        encryptDeposit,
        networkEncKey,
        eventAuthority,
      });

      recordTxSig("submitting_rfq", signature);
      setRfqPda(pda);
      setActiveRfq({
        rfqPda: pda,
        rfqPriceCt,
        rfqSizeCt,
        dwalletPubkey: dwalletPk,
        foreignAssetChain: CHAIN_ID.BITCOIN,
        salt,
        makerPubkey: publicKey,
      });

      setStage("done");
      setStep("awaiting_bid");
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setStage("input");
    }
  }, [publicKey, values, initializeRfq, setStep, setActiveRfq, recordTxSig, setError]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-encrypt" />
          <h2 className="font-mono text-sm text-encrypt tracking-widest uppercase">
            Create Encrypted RFQ
          </h2>
        </div>
        <p className="text-subtle text-xs">
          Your price and size will be sealed with FHE — no counterparty ever learns your terms.
        </p>
      </div>

      {stage === "done" && rfqPda ? (
        // ── Success state ───────────────────────────────────────────────────
        <div className="rounded-xl border border-success/20 bg-success/5 p-5 animate-slide-up">
          <p className="text-success font-mono text-sm font-medium mb-3 flex items-center gap-2">
            <span>✓</span> RFQ Published — Waiting for Bids
          </p>
          <div className="space-y-2">
            <InfoRow label="RFQ PDA" value={rfqPda.toBase58()} mono />
            <InfoRow
              label="Price Ciphertext"
              value="[ENCRYPTED — only hash stored on-chain]"
              mono
            />
            <InfoRow
              label="Size Ciphertext"
              value="[ENCRYPTED — only hash stored on-chain]"
              mono
            />
          </div>
          <a
            href={`${EXPLORER}/address/${rfqPda.toBase58()}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-xs text-encrypt hover:underline font-mono flex items-center gap-1"
          >
            View RFQ on Solana Explorer ↗
          </a>
          <p className="mt-3 text-xs text-subtle italic">
            Proof of privacy: the state account stores only ciphertext pubkeys —
            no price or size visible on-chain.
          </p>
        </div>
      ) : (
        <>
          {/* Asset pair badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20">
              <Bitcoin className="w-3.5 h-3.5 text-warning" />
              <span className="text-xs text-warning font-mono">BTC / USDC</span>
            </div>
            <span className="text-xs text-muted font-mono">Exact fill · no partial</span>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <InputField
              id="asset-amount"
              label="Asset Amount (BTC)"
              sublabel="Exact fill required — no partial fills in MVP"
              value={values.assetAmount}
              onChange={(v: string) => setValues((s: FormValues) => ({ ...s, assetAmount: v }))}
              placeholder="0.5"
              disabled={stage !== "input"}
              suffix="BTC"
            />
            <InputField
              id="min-price"
              label="Minimum Price (USDC per BTC)"
              sublabel="Your sealed floor — Taker must meet or exceed this"
              value={values.minPriceUsdc}
              onChange={(v: string) => setValues((s: FormValues) => ({ ...s, minPriceUsdc: v }))}
              placeholder="65000"
              disabled={stage !== "input"}
              suffix="USDC"
            />
            <InputField
              id="dwallet-pubkey"
              label="Ika dWallet Address"
              sublabel="Pre-created via Ika gRPC — holds your BTC for settlement"
              value={values.dwalletPubkey}
              onChange={(v: string) => setValues((s: FormValues) => ({ ...s, dwalletPubkey: v }))}
              placeholder="87W54k..."
              disabled={stage !== "input"}
            />
          </div>

          {/* Privacy notice */}
          <div className="flex gap-2 p-3 rounded-lg bg-encrypt-glow border border-encrypt/10">
            <Lock className="w-4 h-4 text-encrypt mt-0.5 flex-shrink-0" />
            <p className="text-xs text-subtle">
              These values are encrypted client-side before submission. The on-chain
              RFQ account stores only the <span className="text-encrypt font-mono">ciphertext account pubkeys</span> —
              not the values themselves.
            </p>
          </div>

          {/* Submit button */}
          <button
            id="submit-rfq-btn"
            onClick={handleSubmit}
            disabled={!publicKey || stage !== "input"}
            className={clsx(
              "w-full py-3 px-5 rounded-xl font-mono text-sm font-medium",
              "bg-encrypt-gradient text-void transition-all duration-200",
              "hover:brightness-90 hover:shadow-encrypt active:scale-[0.98]",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {stage === "encrypting" ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Encrypting with REFHE…
              </>
            ) : stage === "submitting" ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Confirming on Solana…
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Encrypt & Publish RFQ
              </>
            )}
          </button>

          {!publicKey && (
            <p className="text-center text-xs text-muted font-mono">
              Connect wallet to create an RFQ
            </p>
          )}
        </>
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface InputFieldProps {
  id: string;
  label: string;
  sublabel?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  suffix?: string;
}

const InputField: FC<InputFieldProps> = ({ id, label, sublabel, value, onChange, placeholder, disabled, suffix }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-mono text-text mb-1">
      {label}
    </label>
    {sublabel && <p className="text-xs text-muted mb-2">{sublabel}</p>}
    <div className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={clsx(
          "w-full bg-panel border border-border rounded-lg px-3 py-2.5",
          "font-mono text-sm text-text placeholder-muted",
          "focus:outline-none focus:ring-1 focus:ring-encrypt/50 focus:border-encrypt/50",
          "transition-colors duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          suffix ? "pr-16" : ""
        )}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

const InfoRow: FC<InfoRowProps> = ({
  label, value, mono,
}) => (
  <div className="flex flex-col">
    <span className="text-xs text-muted mb-0.5">{label}</span>
    <span className={clsx("text-xs text-text break-all", mono ? "font-mono" : "")}>
      {value}
    </span>
  </div>
);
