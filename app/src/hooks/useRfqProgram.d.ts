/**
 * useRfqProgram — Anchor-style transaction builders for the private_rfq program.
 *
 * Since we built the on-chain program with Pinocchio (not Anchor), we manually
 * construct the instruction data and account metas following the exact layout
 * documented in each instruction module.
 */
import { PublicKey } from "@solana/web3.js";
export declare function findRfqPda(maker: PublicKey, salt: Uint8Array): Promise<[PublicKey, number]>;
export declare function findBidPda(rfqPda: PublicKey, taker: PublicKey): Promise<[PublicKey, number]>;
export declare function findVaultPda(rfqPda: PublicKey): Promise<[PublicKey, number]>;
export declare function findEncryptCpiAuthority(): [PublicKey, number];
export declare function findIkaCpiAuthority(): [PublicKey, number];
export declare function useRfqProgram(): {
    initializeRfq: (params: {
        salt: Uint8Array;
        dwalletPubkey: PublicKey;
        foreignAssetChain: number;
        rfqPriceCt: PublicKey;
        rfqSizeCt: PublicKey;
        encryptConfig: PublicKey;
        encryptDeposit: PublicKey;
        networkEncKey: PublicKey;
        eventAuthority: PublicKey;
    }) => Promise<{
        rfqPda: PublicKey;
        signature: string;
    }>;
    submitBid: (params: {
        rfqPda: PublicKey;
        bidPriceCt: PublicKey;
        bidSizeCt: PublicKey;
        escrowAmount: bigint;
        foreignReceiveAddr: string;
    }) => Promise<{
        bidPda: PublicKey;
        signature: string;
    }>;
    requestFheMatch: (params: {
        rfqPda: PublicKey;
        bidPda: PublicKey;
        rfqPriceCt: PublicKey;
        rfqSizeCt: PublicKey;
        bidPriceCt: PublicKey;
        bidSizeCt: PublicKey;
        matchResultCt: PublicKey;
        encryptConfig: PublicKey;
        encryptDeposit: PublicKey;
        networkEncKey: PublicKey;
        eventAuthority: PublicKey;
    }) => Promise<{
        signature: string;
    }>;
    requestMatchDecrypt: (params: {
        rfqPda: PublicKey;
        bidPda: PublicKey;
        matchResultCt: PublicKey;
        decryptionRequest: PublicKey;
        encryptConfig: PublicKey;
        encryptDeposit: PublicKey;
        networkEncKey: PublicKey;
        eventAuthority: PublicKey;
    }) => Promise<{
        signature: string;
    }>;
    revealMatch: (params: {
        rfqPda: PublicKey;
        bidPda: PublicKey;
        decryptionRequest: PublicKey;
        makerUsdcAcct: PublicKey;
        takerUsdcAcct: PublicKey;
    }) => Promise<{
        signature: string;
    }>;
    executeSettlement: (params: {
        rfqPda: PublicKey;
        dwalletCoordinator: PublicKey;
        messageApproval: PublicKey;
        dwalletPda: PublicKey;
        messageDigest: Uint8Array;
        messageMetadataDigest: Uint8Array;
        userPubkey: Uint8Array;
        signatureScheme: number;
        messageApprovalBump: number;
    }) => Promise<{
        signature: string;
    }>;
};
