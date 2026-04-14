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
import { FC } from "react";
export declare const RfqCreationForm: FC;
