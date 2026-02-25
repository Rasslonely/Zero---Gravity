"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, Check } from "lucide-react";

interface Intent {
  amount: number;
  currency: string;
  memo: string;
  confidence: number;
}

interface NLInputProps {
  onConfirm?: (intent: Intent) => void;
}

export function NLInput({ onConfirm }: NLInputProps) {
  const [input, setInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsParsing(true);
    setIntent(null);
    setError(null);

    try {
      // Execute the call to our Next.js API route that wraps Gemini 3 Flash
      const response = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to parse intent");
      }

      setIntent(data);
    } catch (err: any) {
      setError(err.message || "I didn't quite get that. Try: 'Pay $5 for coffee'");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="flex-1 max-w-xl mx-8 relative">
      <form onSubmit={handleSubmit} className="relative group">
        <motion.div 
           className={`absolute -inset-0.5 rounded-full blur-md transition duration-1000 ${isParsing ? 'bg-ai-purple opacity-70 animate-pulse' : 'bg-ai-purple/20 opacity-0 group-hover:opacity-40'}`} 
        />
        
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isParsing || !!intent}
          placeholder="What would you like to pay?"
          className="w-full relative bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/10 rounded-2xl pl-6 pr-14 py-4 text-base focus:outline-none focus:ring-1 focus:ring-ai-purple focus:border-ai-purple/50 transition-all font-sans placeholder:text-white/30 text-white disabled:opacity-50 shadow-[0_0_30px_rgba(0,0,0,0.5)] focus:shadow-[0_0_40px_rgba(168,85,247,0.2)]"
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
          {!isParsing && !intent && (
            <button 
              type="submit"
              disabled={!input.trim()}
              className="w-10 h-10 rounded-xl bg-ai-purple/10 hover:bg-ai-purple/30 flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:hover:bg-ai-purple/10 group-hover:text-ai-purple group-focus-within:bg-ai-purple/20"
            >
              <Sparkles className="w-5 h-5 text-ai-purple/80 group-focus-within:text-ai-purple" />
            </button>
          )}
          {isParsing && (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-ai-purple/10">
              <Loader2 className="w-5 h-5 text-ai-purple animate-spin" />
            </div>
          )}
        </div>
      </form>

      {/* Intent Confirmation Popover */}
      <AnimatePresence>
        {intent && !error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 10 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-4 p-4 rounded-xl glass border-ai-purple/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] z-50 origin-top"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs text-ai-purple uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Intent Parsed
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${intent.confidence > 0.9 ? 'border-bch-green/50 text-bch-green/80' : 'border-yellow-500/50 text-yellow-500/80'} bg-black/50`}>
                {(intent.confidence * 100).toFixed(0)}% Match
              </span>
            </div>

            <div className="flex flex-col gap-1 mb-4">
              <div className="flex items-end gap-2">
                <span className="font-mono text-3xl font-light">${intent.amount.toFixed(2)}</span>
                <span className="text-white/40 mb-1">{intent.currency}</span>
              </div>
              <p className="text-sm text-white/60">For: <span className="text-white">"{intent.memo}"</span></p>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => { setIntent(null); setInput(""); }}
                className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors"
               >
                Cancel
              </button>
              <button 
                onClick={() => onConfirm?.(intent)}
                className="flex-[2] py-2 rounded-lg bg-ai-purple/20 hover:bg-ai-purple/40 border border-ai-purple/50 text-ai-purple text-sm transition-colors shadow-[0_0_15px_rgba(168,85,247,0.2)] font-medium flex items-center justify-center gap-2"
              >
                Load Shadow Card <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.95 }}
             className="absolute top-full left-0 right-0 mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-sm flex items-center justify-between z-50"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100">×</button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
