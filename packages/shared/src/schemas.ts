// ═══════════════════════════════════════════════════════
// ZERO-GRAVITY: Zod Validation Schemas
// ═══════════════════════════════════════════════════════
//
// Runtime validators for Gemini 3 Flash AI output.
// Matches the TypeScript interfaces in types.ts exactly.

import { z } from 'zod';
import { MIN_CONFIDENCE, MAX_SWIPE_USD, MAX_NL_INPUT_LENGTH } from './constants.js';

// ── SwipeIntent (successful parse) ──────────────────────

export const SwipeIntentSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(MAX_SWIPE_USD, `Amount cannot exceed $${MAX_SWIPE_USD}`),
  currency: z.literal('USD'),
  memo: z
    .string()
    .max(100, 'Memo too long')
    .default(''),
  confidence: z
    .number()
    .min(0)
    .max(1),
});

// ── SwipeIntentError (rejected parse) ───────────────────

export const SwipeIntentErrorSchema = z.object({
  error: z.literal('NOT_A_PAYMENT'),
});

// ── NLParseResult (discriminated union) ─────────────────
// Gemini returns EITHER a valid intent OR a rejection.

export const NLParseResultSchema = z.union([
  SwipeIntentSchema,
  SwipeIntentErrorSchema,
]);

// ── Inferred Types (for runtime safety) ─────────────────

export type ZSwipeIntent = z.infer<typeof SwipeIntentSchema>;
export type ZSwipeIntentError = z.infer<typeof SwipeIntentErrorSchema>;
export type ZNLParseResult = z.infer<typeof NLParseResultSchema>;

// ── Helper: Check if result is a valid intent ───────────

export function isSwipeIntent(result: ZNLParseResult): result is ZSwipeIntent {
  return 'amount' in result && !('error' in result);
}

// ── Helper: Check if confidence meets threshold ─────────

export function meetsConfidenceThreshold(result: ZNLParseResult): boolean {
  return isSwipeIntent(result) && result.confidence >= MIN_CONFIDENCE;
}

// ── AI Parse Request Schema (for API route) ─────────────

export const AIParseRequestSchema = z.object({
  input: z
    .string()
    .min(1, 'Input is required')
    .max(MAX_NL_INPUT_LENGTH, `Input too long (max ${MAX_NL_INPUT_LENGTH} chars)`),
});
