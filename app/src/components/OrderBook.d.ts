/**
 * OrderBook — Live RFQ Feed
 *
 * Fetches active RFQs from the relayer API (/api/rfqs/active) and renders
 * each as a row with status badge, chain identifier, and bid action.
 *
 * Note: No price or size data appears here (they're encrypted on-chain).
 * Only RFQ IDs, chain type, status badges, and creation timestamps are shown.
 */
import { FC } from "react";
export declare const OrderBook: FC;
