// ═══════════════════════════════════════════════════════
// ZERO-GRAVITY: Shared Constants
// From ARCHITECTURE.md §4.2 — Security & Performance
// ═══════════════════════════════════════════════════════

// ── AI Pipeline ──

/** Minimum confidence score for Gemini NL parse to be accepted */
export const MIN_CONFIDENCE = 0.85;

/** Maximum single swipe amount in USD */
export const MAX_SWIPE_USD = 500;

/** Maximum daily swipe total per user in USD */
export const MAX_DAILY_USD = 2000;

/** Maximum input length for NL parser (characters) */
export const MAX_NL_INPUT_LENGTH = 200;

// ── Oracle ──

/** Nonce/attestation time-to-live in minutes */
export const NONCE_TTL_MINUTES = 5;

/** Rate limit: swipes per user per minute */
export const RATE_LIMIT_PER_USER = 5;

/** Rate limit: total swipes per minute (all users) */
export const RATE_LIMIT_GLOBAL = 100;

/** Rate limit: requests per IP per minute (Vercel middleware) */
export const RATE_LIMIT_PER_IP = 20;

/** Minimum LP reserve ratio (LP must hold ≥ this × requested amount) */
export const LP_RESERVE_RATIO = 2;

// ── Starknet ──

/** Block confirmations to wait before Oracle signs */
export const STARKNET_FINALITY_BLOCKS = 2;

// ── UI ──

/** Confidence badge thresholds */
export const CONFIDENCE_HIGH = 0.9;
export const CONFIDENCE_MEDIUM = 0.85;

/** Application color tokens (hex) */
export const COLORS = {
  /** Dark base background */
  BASE: '#0a0a0f',
  /** Starknet accent */
  STARKNET_BLUE: '#6366f1',
  /** Bitcoin Cash accent */
  BCH_GREEN: '#22c55e',
  /** AI / Gemini accent */
  AI_PURPLE: '#a855f7',
} as const;
