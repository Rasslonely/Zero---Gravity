import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase client once per module
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export type SwipeStatus = 'idle' | 'locking' | 'attesting' | 'broadcasting' | 'confirmed' | 'failed';

export function useRealtime(swipeId: string | null, starknetAddress?: string | null) {
  const [status, setStatus] = useState<SwipeStatus>('idle');
  const [bchTxId, setBchTxId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    
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
          // In a real app, we'd join with users table or have starknet_address in swipes.
          // For the hackathon, the Oracle includes the address in the metadata or we match by recent tx.
          // Since the Oracle currently doesn't add the address directly to the swipe table, 
          // we'll assume the most recent 'PENDING' swipe is the user's if they just clicked.
          
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
      supabase.removeChannel(channel);
    };
  }, [swipeId, starknetAddress]);

  return { status, bchTxId, setStatus };
}
