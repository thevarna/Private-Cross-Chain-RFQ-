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
import { FC } from "react";
import { ActiveRfq, ActiveBid, SettlementResult } from "@/stores/rfqStore";
interface Props {
    rfq: ActiveRfq;
    bid: ActiveBid;
    settlement: SettlementResult;
    txSigs: Record<string, string>;
}
export declare const SettlementDashboard: FC<Props>;
export {};
