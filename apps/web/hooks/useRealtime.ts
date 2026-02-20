import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase client once per module
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export type SwipeStatus = 'idle' | 'locking' | 'attesting' | 'broadcasting' | 'confirmed' | 'failed';

export function useRealtime(swipeId: string | null) {
  const [status, setStatus] = useState<SwipeStatus>('idle');
  const [bchTxId, setBchTxId] = useState<string | null>(null);

  useEffect(() => {
    if (!swipeId || !supabase) return;

    // Start with the initial assumption that we are locking the vault
    setStatus('locking');

    const channel = supabase
      .channel(`swipe_${swipeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'swipes',
          filter: `id=eq.${swipeId}`,
        },
        (payload) => {
          const newStatus = payload.new.status.toLowerCase() as SwipeStatus;
          setStatus(newStatus);
          
          if (payload.new.bch_tx_hash) {
            setBchTxId(payload.new.bch_tx_hash);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [swipeId]);

  return { status, bchTxId, setStatus }; // setStatus exposed for manual overrides during hackathon demo
}
