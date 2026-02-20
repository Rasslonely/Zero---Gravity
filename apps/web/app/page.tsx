"use client";

import { motion } from "framer-motion";
import { WalletConnect } from "../components/WalletConnect";
import { NLInput } from "../components/NLInput";
import { useBchWallet } from "../hooks/useBchWallet";
import { useVaultStore } from "../stores/vaultStore";
import { SwipeProgress } from "../components/SwipeProgress";
import { ShadowCard } from "../components/ShadowCard";
import { useState } from "react";
import { SwipeStatus } from "../hooks/useRealtime";

export default function Home() {
  const { burnerAddress } = useBchWallet();
  const { balances, connected } = useVaultStore();
  
  // Mock state for visual testing of the UI without a full stack run
  const [swipeStatus, setSwipeStatus] = useState<SwipeStatus>('idle');
  const [bchTx, setBchTx] = useState<string | null>(null);

  const formatBalance = (amount: bigint) => {
    // Basic USDC formatting (6 decimals)
    const num = Number(amount) / 1_000_000;
    return num.toFixed(2);
  };

  const triggerMockSwipe = () => {
    setSwipeStatus('locking');
    setTimeout(() => setSwipeStatus('attesting'), 2000);
    setTimeout(() => setSwipeStatus('broadcasting'), 4000);
    setTimeout(() => {
       setSwipeStatus('confirmed');
       setBchTx("e2123e0ceb1bbf4af828bc0c728b8398b3b6be51331145eb663b160e61c385ef");
    }, 6000);
  };

  return (
    <main className="flex flex-col min-h-screen relative overflow-hidden bg-[#030305] text-white selection:bg-ai-purple/30 font-sans">
      
      {/* Dynamic Animated Background Mesh */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-starknet-blue/20 blur-[150px] mix-blend-screen opacity-60 animate-pulse" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-bch-green/15 blur-[150px] mix-blend-screen opacity-60 flex-shrink-0" />
         <div className="absolute top-[30%] left-[50%] translate-x-[-50%] w-[40%] h-[40%] rounded-full bg-ai-purple/15 blur-[160px] mix-blend-screen" />
         
         {/* Subtle Grid Overlay */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
      </div>

      {/* Top Bar: AI Input Area */}
      <header className="h-24 border-b border-white/5 bg-black/20 backdrop-blur-2xl z-50 flex items-center justify-between px-8 shrink-0 relative shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ai-purple to-starknet-blue flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <span className="font-bold text-white tracking-tighter">0G</span>
          </div>
          <motion.span 
             initial={{ opacity: 0, x: -10 }}
             animate={{ opacity: 1, x: 0 }}
             className="font-semibold tracking-[0.2em] hidden md:block text-sm"
          >
             ZERO-GRAVITY
          </motion.span>
        </div>
        
        {/* Magic UI NL Input */}
        <div className="flex-1 flex justify-center max-w-2xl mx-12">
           <NLInput />
        </div>

        <div className="flex justify-end min-w-[180px]">
          <WalletConnect />
        </div>
      </header>

      {/* Split Screen Container */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10 p-4 lg:p-8 gap-8">
        
        {/* Left Pane: Starknet Vault */}
        <motion.div 
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="flex-1 relative rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-starknet-blue/[0.02] overflow-hidden flex flex-col items-center justify-center p-8 backdrop-blur-xl shadow-2xl"
        >
          <div className="relative w-full max-w-md">
            
            {/* Vault Widget */}
            <div className="glass rounded-[2rem] p-8 border-starknet-blue/20 bg-[#0a0a0f]/80 shadow-[0_0_50px_rgba(99,102,241,0.05)] relative overflow-hidden group hover:border-starknet-blue/40 transition-colors duration-500">
              
              {/* Inner subtle glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-starknet-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <div className="flex justify-between items-center mb-10 relative z-10">
                <h2 className="text-lg font-medium text-white tracking-widest">VALIDIUM VAULT</h2>
                <span className={`text-[10px] font-bold tracking-widest px-3 py-1.5 rounded-full border ${connected ? 'bg-starknet-blue/10 border-starknet-blue/50 text-starknet-blue shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-white/5 border-white/10 text-white/40'}`}>
                   {connected ? 'CONNECTED' : 'STANDBY'}
                </span>
              </div>
              
              <div className="space-y-8 relative z-10">
                <div>
                   <p className="text-xs text-white/40 uppercase tracking-[0.3em] mb-2 font-medium">Available Balance</p>
                   <motion.h1 
                      layoutId="vault-balance"
                      className="text-5xl font-light font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70"
                   >
                      ${formatBalance(balances.USDC)} <span className="text-2xl text-white/30 tracking-normal ml-1">USDC</span>
                   </motion.h1>
                </div>
                
                {!connected && (
                   <p className="text-sm text-starknet-blue/60 leading-relaxed font-light mt-4">Connect your Starknet wallet to access your validium liquidity.</p>
                )}

                {connected && swipeStatus === 'idle' && (
                   <button 
                    onClick={triggerMockSwipe}
                    className="w-full py-4 mt-4 rounded-2xl bg-starknet-blue/10 hover:bg-starknet-blue/20 border border-starknet-blue/30 text-starknet-blue font-semibold tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] flex items-center justify-center gap-3">
                     <span className="w-2 h-2 rounded-full bg-starknet-blue animate-pulse" />
                     Initiate Shadow Swipe
                   </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Pane: BCH Shadow Card */}
        <motion.div 
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="flex-1 relative rounded-3xl border border-white/5 bg-gradient-to-bl from-white/[0.03] to-bch-green/[0.02] overflow-hidden flex flex-col items-center justify-center p-8 backdrop-blur-xl shadow-2xl"
        >
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
            <motion.div 
               animate={swipeStatus !== 'idle' ? { y: -20, scale: 0.95 } : { y: 0, scale: 1 }}
               transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <ShadowCard swipeStatus={swipeStatus} burnerAddress={burnerAddress} />
            </motion.div>
          </div>
        </motion.div>
        
      </div>

      {/* Absolute Centered Holographic Bridge for Swipe Progress */}
      {swipeStatus !== 'idle' && (
        <div className="absolute inset-x-0 bottom-12 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 pointer-events-none flex justify-center">
            <div className="pointer-events-auto">
               <SwipeProgress status={swipeStatus} bchTxId={bchTx} />
            </div>
        </div>
      )}
    </main>
  );
}
