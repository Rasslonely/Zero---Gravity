"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, ArrowRightCircle, ExternalLink, Timer, ShieldCheck } from "lucide-react";
import { SwipeStatus } from "../hooks/useRealtime";

interface SwipeProgressProps {
  status: SwipeStatus;
  bchTxId: string | null;
}

const STAGES = [
  { key: 'locking', label: 'Locking Vault' },
  { key: 'attesting', label: 'Oracle Attestation' },
  { key: 'broadcasting', label: 'Broadcasting BCH' },
  { key: 'confirmed', label: 'Confirmed' }
];

export function SwipeProgress({ status, bchTxId }: SwipeProgressProps) {
  const [timer, setTimer] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'locking' && !startTime) {
      setStartTime(performance.now());
      setTimer(0);
    }
  }, [status, startTime]);

  useEffect(() => {
    if (startTime && status !== 'confirmed' && status !== 'failed') {
      const interval = setInterval(() => {
        setTimer((performance.now() - startTime!) / 1000);
      }, 57);
      return () => clearInterval(interval);
    }
  }, [startTime, status]);

  if (status === 'idle') return null;

  const currentStageIndex = STAGES.findIndex(s => s.key === status);
  // If failed, we want to stay at the stage we were at, or show the failure clearly.
  // We'll set _index to the last successful stage or -1 if none.
  const _index = currentStageIndex;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full mt-10 glass rounded-[24px] p-8 border-white/5 bg-[#0a0a0f]/60 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] min-w-[320px]"
      aria-live="polite"
    >
      <div className="flex justify-between items-start mb-8">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 flex items-center gap-3">
          <ArrowRightCircle className="w-4 h-4 text-ai-purple" />
          Transaction Lifecycle
        </h3>
        {timer > 0 && (
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-2 text-ai-purple text-xs font-mono">
                <Timer className="w-3 h-3" />
                {timer.toFixed(2)}s
             </div>
             {status === 'confirmed' && (
                <span className="text-[9px] text-bch-green font-bold tracking-tighter mt-1 flex items-center gap-1">
                   <ShieldCheck className="w-3 h-3" /> ZERO-BRIDGE-RISK
                </span>
             )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {STAGES.map((stage, i) => {
          const isPast = status !== 'failed' && (_index > i || status === 'confirmed');
          const isCurrent = (status === 'failed' && _index === i) || (_index === i && status !== 'confirmed');
          const isFailed = status === 'failed' && _index === i;
          
          return (
            <div key={stage.key} className="flex items-center gap-5 group">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-700
                 ${isPast ? 'bg-bch-green/20 border border-bch-green text-bch-green shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 
                   isFailed ? 'bg-red-500/20 border-2 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-shake' :
                   isCurrent ? 'bg-starknet-blue/20 border-2 border-starknet-blue text-starknet-blue shadow-[0_0_20px_rgba(99,102,241,0.6)] scale-110' : 
                   'bg-white/5 border border-white/10 text-white/20'}`}
               >
                 {isPast ? <Check className="w-4 h-4" /> : 
                  isFailed ? <Check className="w-4 h-4 rotate-45" /> : 
                  isCurrent ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                  <span className="text-[10px] font-bold">{i+1}</span>}
               </div>
               <span className={`text-sm transition-all duration-700 font-medium tracking-wide ${
                 isPast ? 'text-white/80' : 
                 isCurrent ? 'text-starknet-blue drop-shadow-md font-bold' : 
                 'text-white/30'
               }`}>
                 {stage.label}
               </span>
            </div>
          );
        })}
      </div>

      {status === 'confirmed' && bchTxId && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 pt-4 border-t border-white/10"
        >
           <a 
             href={`https://chipnet.chaingraph.cash/tx/${bchTxId}`} 
             target="_blank" 
             rel="noopener noreferrer"
             className="flex items-center justify-between text-xs text-bch-green hover:text-bch-green/80 bg-bch-green/10 rounded-lg p-3 transition-colors"
           >
             <span className="font-mono truncate mr-2">TX: {bchTxId}</span>
             <ExternalLink className="w-4 h-4 shrink-0" />
           </a>
        </motion.div>
      )}

      {status === 'failed' && (
        <div className="mt-6 pt-4 border-t border-red-500/30 text-red-500 text-xs text-center border-dashed">
          Transaction failed. Please try again.
        </div>
      )}
    </motion.div>
  );
}
