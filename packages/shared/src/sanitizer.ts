// ═══════════════════════════════════════════════════════
// ZERO-GRAVITY: Input Sanitizer for AI Pipeline
// ═══════════════════════════════════════════════════════
//
// Sanitizes user natural-language input before sending
// to Gemini 3 Flash. Mitigates prompt injection attacks
// per ARCHITECTURE.md §4 security model.
//
// Placed in shared package so both web API and Oracle
// can import it if needed.

import { MAX_NL_INPUT_LENGTH } from './constants.js';

// ── Injection Patterns ──────────────────────────────────
// Case-insensitive patterns that suggest prompt injection

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/i,
  /system\s*:/i,
  /you\s+are\s+(now|a)\s/i,
  /forget\s+(everything|all|your)/i,
  /pretend\s+(to\s+be|you('re| are))/i,
  /new\s+role\s*:/i,
  /override\s+(your|the)\s+(instructions?|rules?|system)/i,
  /act\s+as\s+(if|a)\s/i,
  /\bDAN\b/,                     // "Do Anything Now" jailbreak
  /jailbreak/i,
  /\[INST\]/i,                   // LLM instruction format
  /<<SYS>>/i,                    // Llama system prompt format
  /```\s*(system|assistant)/i,   // Code block injection
  /\bfrom now on\b/i,
  /\bdisregard\b/i,
];

// ── Sanitizer Result ────────────────────────────────────

export interface SanitizerResult {
  /** The cleaned input string */
  sanitized: string;
  /** True if injection patterns were detected */
  flaggedInjection: boolean;
  /** Which patterns were matched (for audit log) */
  matchedPatterns: string[];
}

// ── Main Sanitizer ──────────────────────────────────────

export function sanitizeInput(raw: string): SanitizerResult {
  const matchedPatterns: string[] = [];

  // 1. Trim whitespace
  let sanitized = raw.trim();

  // 2. Enforce max length
  if (sanitized.length > MAX_NL_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_NL_INPUT_LENGTH);
  }

  // 3. Strip HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // 4. Strip markdown formatting (bold, italic, headers, code blocks)
  sanitized = sanitized
    .replace(/```[\s\S]*?```/g, '')   // code blocks
    .replace(/`[^`]*`/g, '')          // inline code
    .replace(/#{1,6}\s/g, '')         // headers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')  // bold/italic
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1');    // underscored bold/italic

  // 5. Collapse multiple spaces/newlines
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // 6. Check injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      matchedPatterns.push(pattern.source);
    }
  }

  const flaggedInjection = matchedPatterns.length > 0;

  return {
    sanitized,
    flaggedInjection,
    matchedPatterns,
  };
}
