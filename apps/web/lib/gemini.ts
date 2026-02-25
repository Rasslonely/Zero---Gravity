/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Gemini Client (Robust)
 * ═══════════════════════════════════════════════════════
 *
 * Singleton Gemini client with:
 * - Key Rotation (GOOGLE_AI_API_KEY, _2, _3)
 * - Exponential Backoff Retry (429/503 errors)
 * - Simplified System Prompt (for Flash reliability)
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// ── System Prompt (Simplified for Flash) ────────────────
const SYSTEM_PROMPT = `You are a payment intent parser for the Zero-Gravity protocol. 
Your task is to extract the EXACT numerical amount and a short memo from user text.

RULES:
1. ONLY payment messages are parsed. 
2. Output valid JSON with no preamble:
   - Success: {"amount": <number>, "currency": "USD", "memo": "<string>", "confidence": <0.0-1.0>}
   - Failure: {"error": "NOT_A_PAYMENT"}
3. "amount" MUST be a number (use decimals for fractions, e.g., 0.5).
4. "currency" is ALWAYS "USD".
5. "confidence" must be high (>0.85) for a match.
6. Max single amount: $500.

EXAMPLES:
- "pay 0.5 for a quick coffee" -> {"amount": 0.5, "currency": "USD", "memo": "quick coffee", "confidence": 0.99}
- "send 50 bucks to bob for pizza" -> {"amount": 50, "currency": "USD", "memo": "bob for pizza", "confidence": 0.95}
- "transfer $1.25 for tolls" -> {"amount": 1.25, "currency": "USD", "memo": "tolls", "confidence": 0.98}
- "what's the price of btc?" -> {"error": "NOT_A_PAYMENT"}`;

// ── Response Schema ─────────────────────────────────────
const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  required: ['amount', 'currency', 'memo', 'confidence'],
  properties: {
    amount: { type: SchemaType.NUMBER, description: 'Payment amount in USD' },
    currency: { type: SchemaType.STRING, description: 'Always USD' },
    memo: { type: SchemaType.STRING, description: 'Payment memo/description' },
    confidence: { type: SchemaType.NUMBER, description: 'Confidence score 0-1' },
    error: { type: SchemaType.STRING, description: 'NOT_A_PAYMENT if not a payment' },
  },
};

// ── Client Logic ────────────────────────────────────────

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash'];

function getKeys(): string[] {
  const keys = [
    process.env.GOOGLE_AI_API_KEY,
    process.env.GOOGLE_AI_API_KEY_2,
    process.env.GOOGLE_AI_API_KEY_3
  ].filter(Boolean) as string[];
  
  if (keys.length === 0) {
    throw new Error('Missing GOOGLE_AI_API_KEY* environment variables');
  }
  return keys;
}

export interface GeminiParseResult {
  raw: Record<string, unknown>;
  model: string;
  tokensUsed: number;
  latencyMs: number;
}

/**
 * WATERFALL STRATEGY:
 * 1. Try Primary Model (Gemini 3) -> Rotate Keys 1, 2, 3
 * 2. If all Quotas exhausted -> Fallback to Model (Gemini 2) -> Rotate Keys 1, 2, 3
 */
async function generateWithWaterfall(prompt: string): Promise<{ text: string; tokens: number; modelUsed: string }> {
  const keys = getKeys();
  
  // Outer Loop: Models (Primary -> Fallback)
  for (const modelId of MODELS) {
    // Inner Loop: Keys (Rotation)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: modelId,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      });

      try {
        // Attempt generation
        const result = await model.generateContent(prompt);
        return {
          text: result.response.text(),
          tokens: result.response.usageMetadata?.totalTokenCount ?? 0,
          modelUsed: modelId
        };
      } catch (err: any) {
        const isQuota = err.message.includes('429');
        const isServer = err.message.includes('503') || err.message.includes('500') || err.message.includes('fetch failed');
        
        // Log warning
        console.warn(`   ⚠️  [${modelId}] Key ${i + 1} failed (${isQuota ? 'Quota' : isServer ? 'Server' : err.message})...`);

        // If it's NOT a recoverable error (e.g. invalid request), throw immediately
        if (!isQuota && !isServer) throw err;

        // If it IS Quota/Server, continue to next Key/Model loop
        continue;
      }
    }
  }
  
  throw new Error('All models and keys exhausted (Rate Limited)');
}

/**
 * Main export used by the API route
 */
export async function parseNaturalLanguage(
  sanitizedInput: string,
): Promise<GeminiParseResult> {
  const startMs = Date.now();

  // Use Waterfall Logic
  const { text, tokens, modelUsed } = await generateWithWaterfall(sanitizedInput);
  
  const latencyMs = Date.now() - startMs;

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
  } catch {
    raw = { error: 'NOT_A_PAYMENT' };
  }

  return {
    raw,
    model: modelUsed,
    tokensUsed: tokens,
    latencyMs,
  };
}
