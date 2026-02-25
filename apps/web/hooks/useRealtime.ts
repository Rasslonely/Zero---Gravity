import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

export type SwipeStatus = 'idle' | 'locking' | 'attesting' | 'broadcasting' | 'confirmed' | 'failed';

export function useRealtime(swipeId: string | null, starknetAddress?: string | null) {
  const [status, setStatus] = useState<SwipeStatus>('idle');
  const [bchTxId, setBchTxId] = useState<string | null>(null);

  const swipeIdRef = useRef(swipeId);
  const starknetAddressRef = useRef(starknetAddress);

  useEffect(() => {
    swipeIdRef.current = swipeId;
    starknetAddressRef.current = starknetAddress;
  }, [swipeId, starknetAddress]);

  // 1. Stable WebSocket Connection (Created only once on mount)
  useEffect(() => {
    if (!supabase) return;
    
    const channelName = `swipes_realtime_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      ?.channel(channelName)
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
             const currentSwipeId = swipeIdRef.current;
             const currentAddr = starknetAddressRef.current;
             
             if (currentSwipeId && data.id === currentSwipeId) {
                setStatus(data.status.toLowerCase() as SwipeStatus);
                if (data.bch_tx_hash) setBchTxId(data.bch_tx_hash);
             } 
             else if (!currentSwipeId && currentAddr) {
                setStatus(data.status.toLowerCase() as SwipeStatus);
                if (data.bch_tx_hash) setBchTxId(data.bch_tx_hash);
             }
          }
        }
      )
      .subscribe((status, err) => {
         if (err) console.error("❌ Supabase WS Error:", err);
      });

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []); // Empty deps! Never re-create the channel on swipeId change.

  // 2. Polling Fallback (Hackathon Bulletproof Code)
  // If WebSockets drop (common on Vercel strict mode), polling saves the day.
  useEffect(() => {
    if (!supabase || !swipeId || status === 'confirmed' || status === 'failed') return;
    
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          ?.from('swipes')
          .select('status, bch_tx_hash')
          .eq('id', swipeId)
          .single() ?? { data: null, error: null };
          
        if (data) {
          const newStatus = data.status.toLowerCase() as SwipeStatus;
          if (newStatus !== status) {
            console.log("🔄 Polling caught status update:", newStatus);
            setStatus(newStatus);
            if (data.bch_tx_hash) setBchTxId(data.bch_tx_hash);
          }
        }
      } catch (err) {
        // Silently ignore polling network errors
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [swipeId, status]);

  // 3. Safety timeout: Reset UI if stuck for too long
  useEffect(() => {
    if (status === 'locking' || status === 'attesting') {
      const timer = setTimeout(() => {
        console.warn("⏱️ Swipe Timeout: No updates from Oracle after 25s. Resetting UI.");
        setStatus('failed');
      }, 25000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return { status, bchTxId, setStatus };
}
