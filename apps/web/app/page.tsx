"use client";

import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* Top Bar: AI Input Area */}
      <header className="h-20 border-b border-white/10 glass z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          {/* Logo Placeholder */}
          <div className="w-8 h-8 rounded-full bg-ai-purple flex items-center justify-center">
            <span className="font-bold text-sm">0G</span>
          </div>
          <span className="font-semibold tracking-wider">ZERO-GRAVITY</span>
        </div>
        
        {/* Magic UI NL Input Placeholder */}
        <div className="flex-1 max-w-xl mx-8 relative">
          <input 
            type="text" 
            placeholder="What would you like to pay?"
            className="w-full bg-black/40 border border-white/10 rounded-full px-6 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ai-purple/50 transition-all font-sans"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-ai-purple/20 flex items-center justify-center">
              <span className="text-ai-purple text-xs">AI</span>
            </div>
          </div>
        </div>

        <div className="w-40 flex justify-end">
          {/* Profile / Wallet Trigger Placeholder */}
          <div className="h-10 px-4 rounded-full border border-white/10 flex items-center gap-2 hover:bg-white/5 cursor-pointer transition-colors">
            <span className="text-sm">Connect</span>
          </div>
        </div>
      </header>

      {/* Split Screen Container */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        
        {/* Left Pane: Starknet Vault */}
        <div className="flex-1 relative border-r border-white/5 bg-gradient-to-br from-[#0a0a0f] to-starknet-blue/5 overflow-hidden flex items-center justify-center p-8">
          {/* Background Glow */}
          <div className="absolute top-1/4 -left-1/4 w-96 h-96 rounded-full bg-starknet-blue/20 blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 w-full max-w-md glass rounded-2xl p-8 border-starknet-blue/20">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-medium text-starknet-blue">STARKNET VAULT</h2>
              <span className="text-xs text-white/50 px-2 py-1 rounded bg-white/5">DISCONNECTED</span>
            </div>
            
            <div className="space-y-6">
              <div>
                 <p className="text-sm text-white/50 uppercase tracking-widest mb-1">Available Balance</p>
                 <motion.h1 
                    layoutId="vault-balance"
                    className="text-4xl font-light font-mono"
                 >
                    $0.00 <span className="text-xl text-white/30">USD</span>
                 </motion.h1>
              </div>
              
              <button className="w-full py-4 rounded-xl bg-starknet-blue/10 hover:bg-starknet-blue/20 border border-starknet-blue/30 text-starknet-blue font-medium transition-colors">
                Connect Validium
              </button>
            </div>
          </div>
        </div>

        {/* Right Pane: BCH Shadow Card */}
        <div className="flex-1 relative bg-gradient-to-bl from-[#0a0a0f] to-bch-green/5 overflow-hidden flex items-center justify-center p-8">
          {/* Background Glow */}
          <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 rounded-full bg-bch-green/10 blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* The Shadow Card Prototype */}
            <motion.div 
               whileHover={{ scale: 1.02, rotateY: 5, rotateX: 5 }}
               transition={{ type: "spring", stiffness: 400, damping: 30 }}
               className="w-[380px] h-[240px] rounded-2xl glass border-bch-green/20 p-6 flex flex-col justify-between relative overflow-hidden backdrop-blur-2xl bg-white/5 shrink-0"
               style={{ perspective: 1000 }}
            >
              {/* Holographic overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50" />
              
              <div className="flex justify-between items-start relative z-10">
                <div className="w-12 h-8 rounded bg-yellow-500/20 border border-yellow-500/40 relative overflow-hidden">
                    {/* Chip lines */}
                    <div className="absolute top-1/2 left-0 w-full h-px bg-yellow-500/30" />
                    <div className="absolute top-0 left-1/2 w-px h-full bg-yellow-500/30" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs tracking-widest text-bch-green uppercase opacity-80">Shadow Protocol</span>
                    <div className="w-2 h-2 rounded-full bg-bch-green animate-pulse" />
                </div>
              </div>

              <div className="relative z-10 text-center">
                 <p className="text-sm text-white/40 mb-2 uppercase tracking-widest">Awaiting Intent</p>
                 <div className="h-px w-24 bg-white/10 mx-auto" />
              </div>
              
              <div className="flex justify-between items-end relative z-10 font-mono text-sm opacity-60">
                <span>____ ____ ____ ____</span>
                <span>0G</span>
              </div>
            </motion.div>
          </div>
        </div>
        
      </div>
    </main>
  );
}
