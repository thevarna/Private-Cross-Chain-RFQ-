/**
 * StatusStepper — 8-Step FHE × MPC Lifecycle Visualizer
 *
 * This component is the centrepiece of the Maker/Taker UX.
 * It renders a vertical stepper that animates through all phases of the RFQ,
 * from initial encryption to final Ika signature commitment.
 *
 * Each step maps to a discrete on-chain state transition, making the
 * invisible cryptographic processes tangible for judges and traders alike.
 */
import { FC } from "react";
import { LifecycleStep } from "@/stores/rfqStore";
interface Props {
    currentStep: LifecycleStep;
    escrowAmount?: bigint;
    matchResult?: boolean | null;
    ikaSignature?: Uint8Array | null;
    txSigs?: Record<string, string>;
}
export declare const StatusStepper: FC<Props>;
export {};
