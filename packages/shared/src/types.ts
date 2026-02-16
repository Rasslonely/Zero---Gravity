// ═══════════════════════════════════════════════════════
// ZERO-GRAVITY: Core Data Models
// From ARCHITECTURE.md §3.5 — Source of Truth
// ═══════════════════════════════════════════════════════

// ── Enums ──

/** Swipe lifecycle status */
export type SwipeStatus =
  | 'PENDING'
  | 'ATTESTED'
  | 'BROADCAST'
  | 'CONFIRMED'
  | 'FAILED'
  | 'EXPIRED';

/** Supported vault deposit assets */
export type DepositAsset = 'ETH' | 'USDC' | 'WBTC' | 'STRK';

// ── AI / Gemini 3 Flash ──

/** Gemini 3 Flash: NL Parse Output (successful) */
export interface SwipeIntent {
  readonly amount: number;
  readonly currency: 'USD';
  readonly memo: string;
  readonly confidence: number;
}

/** Gemini 3 Flash: NL Parse Output (rejected) */
export interface SwipeIntentError {
  readonly error: 'NOT_A_PAYMENT';
}

/** Union: either a valid intent or a rejection */
export type NLParseResult = SwipeIntent | SwipeIntentError;

/** AI Parse audit log entry */
export interface AIParseLog {
  readonly id: string;
  readonly userId: string;
  readonly rawInput: string;
  readonly sanitizedInput: string;
  readonly outputJson: NLParseResult;
  readonly confidence: number | null;
  readonly flaggedInjection: boolean;
  readonly createdAt: Date;
}

// ── Users ──

/** User identity (cross-chain) */
export interface User {
  readonly id: string;
  readonly starknetAddress: `0x${string}`;
  readonly bchAddress: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ── Vault ──

/** Starknet vault deposit record */
export interface VaultDeposit {
  readonly id: string;
  readonly userId: string;
  readonly asset: DepositAsset;
  readonly amount: bigint;
  readonly starknetTxHash: string;
  readonly blockNumber: number;
  readonly depositedAt: Date;
}

// ── Swipe ──

/** The core swipe transaction */
export interface Swipe {
  readonly id: string;
  readonly userId: string;
  readonly nonce: number;
  readonly amountUsd: number;
  readonly amountBch: number | null;
  readonly bchRecipient: string;
  readonly status: SwipeStatus;
  readonly nlInput: string | null;
  readonly aiConfidence: number | null;

  // Starknet side
  readonly starknetTxHash: string;
  readonly starknetBlock: number | null;

  // Oracle side
  readonly oracleSignature: Uint8Array | null;
  readonly oracleMessage: Uint8Array | null;
  readonly attestedAt: Date | null;

  // BCH side
  readonly bchTxHash: string | null;
  readonly bchConfirmedAt: Date | null;

  // Lifecycle
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly expiresAt: Date;
}

// ── Oracle ──

/** Oracle attestation payload (what gets signed) */
export interface OracleAttestation {
  readonly bchRecipient: string;
  readonly amountSatoshis: bigint;
  readonly nonce: number;
  readonly timestamp: number;
}

/** Packed message format for checkDataSig verification */
export interface PackedOracleMessage {
  readonly raw: Uint8Array;
  readonly signature: Uint8Array;
  readonly publicKey: Uint8Array;
}

// ── Liquidity Pool ──

/** Liquidity pool state (BCH Covenant mirror) */
export interface LiquidityPool {
  readonly covenantAddress: string;
  readonly totalDepositedBch: number;
  readonly totalReleasedBch: number;
  readonly availableBch: number;
  readonly lastSyncedAt: Date;
}

// ── Frontend Stores ──

/** Frontend store: Vault State */
export interface VaultState {
  readonly connected: boolean;
  readonly address: string | null;
  readonly balances: Record<DepositAsset, bigint>;
  readonly pendingSwipes: readonly Swipe[];
}

/** Frontend store: BCH State */
export interface BchState {
  readonly burnerAddress: string | null;
  readonly burnerBalance: number;
  readonly recentTxs: readonly string[];
}

// ── Supabase Realtime ──

/** Supabase Realtime subscription payload */
export interface RealtimeSwipePayload {
  readonly eventType: 'INSERT' | 'UPDATE';
  readonly new: Swipe;
  readonly old: Swipe | null;
}
