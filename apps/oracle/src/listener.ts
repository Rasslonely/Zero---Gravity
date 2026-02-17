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
export interface SwipePayload {
  id: string;
  user_address: string;
  bch_recipient: string;
  amount_usd: number;
  amount_bch: number;
  nonce: number;
  status: string;
  created_at: string;
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
