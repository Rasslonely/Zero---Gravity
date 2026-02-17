/**
 * ═══════════════════════════════════════════════════════
 * ZERO-GRAVITY: Supabase Realtime Listener
 * ═══════════════════════════════════════════════════════
 *
 * Subscribes to Supabase Realtime `postgres_changes` on the
 * `swipes` table. Fires callback for each new PENDING swipe.
 *
 * Requires Supabase Realtime to be enabled and the `swipes`
 * table to exist with a `status` column.
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { config } from './config.js';

// ── Types ───────────────────────────────────────────────
// Matches actual columns from 001_initial.sql — swipes table
export interface SwipePayload {
  id: string;
  user_id: string;
  nonce: number;
  amount_usd: number;
  amount_bch: number | null;
  bch_recipient: string;
  status: string;
  nl_input: string | null;
  ai_confidence: number | null;
  starknet_tx_hash: string;
  starknet_block: number | null;
  oracle_signature: string | null;
  oracle_message: string | null;
  attested_at: string | null;
  bch_tx_hash: string | null;
  bch_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

// ── Listener ────────────────────────────────────────────
export function startListener(
  onSwipe: (payload: SwipePayload) => void
): RealtimeChannel {
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

  const channel = supabase
    .channel('swipes-oracle')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'swipes',
        filter: 'status=eq.PENDING',
      },
      (payload) => {
        console.log(`📡 New PENDING swipe detected: ${payload.new.id}`);
        onSwipe(payload.new as SwipePayload);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('🔌 Realtime subscription active — listening for swipes');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime channel error:', err?.message || 'unknown');
      } else if (status === 'TIMED_OUT') {
        console.error('⏰ Realtime subscription timed out — will retry');
      } else {
        console.log(`🔌 Realtime status: ${status}`);
      }
    });

  return channel;
}
