/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: AI Parse API Route
 * ═══════════════════════════════════════════════════════
 *
 * POST /api/ai/parse
 *
 * Takes natural language input, sanitizes it against injection,
 * sends to Gemini 3 Flash, validates output with Zod, enforces
 * confidence threshold, and logs everything to ai_parse_log.
 *
 * Request:  { "input": "Pay $25 for coffee" }
 * Response: { "amount": 25, "currency": "USD", "memo": "coffee", "confidence": 0.95 }
 *           or { "error": "NOT_A_PAYMENT" }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  sanitizeInput,
  AIParseRequestSchema,
  NLParseResultSchema,
  MIN_CONFIDENCE,
  isSwipeIntent,
} from '@zero-gravity/shared';
import { parseNaturalLanguage } from '../../../../lib/gemini.js';
import { getSupabaseServer } from '../../../../lib/supabase-server.js';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const parseResult = AIParseRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const rawInput = parseResult.data.input;

    // 2. Sanitize input against injection
    const { sanitized, flaggedInjection, matchedPatterns } =
      sanitizeInput(rawInput);

    // If injection was flagged, reject immediately without calling Gemini
    if (flaggedInjection) {
      console.warn(
        `⚠️  Injection flagged: "${rawInput.substring(0, 50)}..." ` +
        `(patterns: ${matchedPatterns.join(', ')})`
      );

      // Still log to ai_parse_log for audit
      await logParse({
        rawInput,
        sanitizedInput: sanitized,
        outputJson: { error: 'NOT_A_PAYMENT' as const },
        confidence: null,
        flaggedInjection: true,
      });

      return NextResponse.json({ error: 'NOT_A_PAYMENT' });
    }

    // 3. Call Gemini 3 Flash
    const geminiResult = await parseNaturalLanguage(sanitized);

    // 4. Validate output with Zod
    const zodResult = NLParseResultSchema.safeParse(geminiResult.raw);

    if (!zodResult.success) {
      // Gemini returned something unexpected — treat as not-a-payment
      console.warn(`⚠️  Gemini returned invalid schema: ${JSON.stringify(geminiResult.raw)}`);

      await logParse({
        rawInput,
        sanitizedInput: sanitized,
        outputJson: { error: 'NOT_A_PAYMENT' as const },
        confidence: null,
        flaggedInjection: false,
      });

      return NextResponse.json({ error: 'NOT_A_PAYMENT' });
    }

    const nlResult = zodResult.data;

    // 5. Enforce confidence threshold
    if (isSwipeIntent(nlResult) && nlResult.confidence < MIN_CONFIDENCE) {
      console.log(
        `📉 Below confidence threshold: ${nlResult.confidence} < ${MIN_CONFIDENCE}`
      );

      await logParse({
        rawInput,
        sanitizedInput: sanitized,
        outputJson: { error: 'NOT_A_PAYMENT' as const },
        confidence: nlResult.confidence,
        flaggedInjection: false,
      });

      return NextResponse.json({ error: 'NOT_A_PAYMENT' });
    }

    // 6. Log successful parse
    const confidence = isSwipeIntent(nlResult) ? nlResult.confidence : null;

    await logParse({
      rawInput,
      sanitizedInput: sanitized,
      outputJson: nlResult,
      confidence,
      flaggedInjection: false,
    });

    console.log(
      `✅ AI Parse: "${sanitized.substring(0, 40)}..." → ` +
      `${JSON.stringify(nlResult)} (${geminiResult.latencyMs}ms, ${geminiResult.tokensUsed} tokens)`
    );

    // 7. Return result
    return NextResponse.json(nlResult);

  } catch (error: any) {
    console.error('❌ AI Parse error:', error.message || error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ── Audit Logger ────────────────────────────────────────

interface ParseLogEntry {
  rawInput: string;
  sanitizedInput: string;
  outputJson: Record<string, unknown>;
  confidence: number | null;
  flaggedInjection: boolean;
}

async function logParse(entry: ParseLogEntry): Promise<void> {
  try {
    const supabase = getSupabaseServer();
    await supabase.from('ai_parse_log').insert({
      raw_input: entry.rawInput,
      sanitized_input: entry.sanitizedInput,
      output_json: entry.outputJson,
      confidence: entry.confidence,
      flagged_injection: entry.flaggedInjection,
    });
  } catch (err: any) {
    // Non-fatal: don't crash the request if logging fails
    console.error('⚠️  Failed to log AI parse:', err.message);
  }
}
