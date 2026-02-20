"use client";

import { motion } from "framer-motion";
import { Check, Loader2, ArrowRightCircle, ExternalLink } from "lucide-react";
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
  if (status === 'idle') return null;

  const currentStageIndex = STAGES.findIndex(s => s.key === status);
  const _index = currentStageIndex === -1 && status === 'failed' ? 4 : currentStageIndex;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm mt-8 glass rounded-2xl p-6 border-white/10"
    >
      <h3 className="text-xs uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2">
        <ArrowRightCircle className="w-4 h-4 text-ai-purple" />
        Transaction Lifecycle
      </h3>

      <div className="space-y-4">
        {STAGES.map((stage, i) => {
          const isPast = _index > i || status === 'confirmed';
          const isCurrent = _index === i && status !== 'confirmed';
          
          return (
            <div key={stage.key} className="flex items-center gap-4">
               <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-500
                 ${isPast ? 'bg-bch-green/20 border border-bch-green/50 text-bch-green' : 
                   isCurrent ? 'bg-starknet-blue/20 border border-starknet-blue/50 text-starknet-blue shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 
                   'bg-white/5 border border-white/10 text-white/20'}`}
               >
                 {isPast ? <Check className="w-3 h-3" /> : 
                  isCurrent ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                  <span className="text-[10px]">{i+1}</span>}
               </div>
               <span className={`text-sm transition-colors duration-500 font-medium ${
                 isPast ? 'text-white' : 
                 isCurrent ? 'text-starknet-blue drop-shadow-md' : 
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
