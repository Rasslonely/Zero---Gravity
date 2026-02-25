import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase client once per module
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Safely initialize to prevent WebSocket crashes if env vars are missing
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export type SwipeStatus = 'idle' | 'locking' | 'attesting' | 'broadcasting' | 'confirmed' | 'failed';

export function useRealtime(swipeId: string | null, starknetAddress?: string | null) {
  const [status, setStatus] = useState<SwipeStatus>('idle');
  const [bchTxId, setBchTxId] = useState<string | null>(null);

  useEffect(() => {
    // Skip subscription if Supabase is not configured
    if (!supabase) {
      console.warn("⚠️ Supabase realtime skipped: Missing environment variables");
      return;
    }
    
    // If we have an address but no specific swipe ID, we are waiting for a new one to appear
    const channel = supabase
      .channel('swipes_realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'swipes',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
             const data = payload.new;
             
             // If we are tracking a specific ID
             if (swipeId && data.id === swipeId) {
                setStatus(data.status.toLowerCase() as SwipeStatus);
                if (data.bch_tx_hash) setBchTxId(data.bch_tx_hash);
             } 
             // Logic for "Auto-discover" new swipe (Winning Edge Feature)
             else if (!swipeId && starknetAddress) {
                // For the demo: if it's PENDING and we just clicked, it's ours.
                setStatus(data.status.toLowerCase() as SwipeStatus);
                if (data.bch_tx_hash) setBchTxId(data.bch_tx_hash);
             }
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [swipeId, starknetAddress]);

  // Safety timeout: Reset UI if stuck in 'locking' for too long (e.g. dropped TX)
  useEffect(() => {
    if (status === 'locking' || status === 'attesting') {
      const timer = setTimeout(() => {
        console.warn("⏱️ Swipe Timeout: No updates from L2/Oracle after 30s. Resetting UI.");
        setStatus('failed');
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return { status, bchTxId, setStatus };
}
