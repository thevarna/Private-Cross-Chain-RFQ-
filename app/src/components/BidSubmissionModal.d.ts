/**
 * BidSubmissionModal — Taker UI
 *
 * Visible when a Taker clicks "Place Bid" on an active RFQ from the OrderBook.
 * Walks through:
 * 1. Bid parameter entry
 * 2. FHE encryption of bid price & size (Encrypt gRPC)
 * 3. submit_bid (escrow lock) + request_fhe_match (graph execution trigger)
 * 4. Hands control to StatusStepper (fhe_computing state)
 */
import { FC } from "react";
import { ActiveRfq } from "@/stores/rfqStore";
interface Props {
    rfq: ActiveRfq;
    onClose: () => void;
}
export declare const BidSubmissionModal: FC<Props>;
export {};
