"use client";

import { motion } from "framer-motion";
import { WalletConnect } from "../components/WalletConnect";
import { NLInput } from "../components/NLInput";
import { useBchWallet } from "../hooks/useBchWallet";
import { useVaultStore } from "../stores/vaultStore";
import { SwipeProgress } from "../components/SwipeProgress";
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
    <main className="flex flex-col min-h-screen relative overflow-hidden bg-bg-zero text-white">
      {/* Top Bar: AI Input Area */}
      <header className="h-20 border-b border-white/10 glass z-50 flex items-center justify-between px-6 shrink-0 relative">
        <div className="flex items-center gap-2">
          {/* Logo */}
          <div className="w-8 h-8 rounded-full bg-ai-purple flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            <span className="font-bold text-sm">0G</span>
          </div>
          <span className="font-semibold tracking-wider hidden sm:block">ZERO-GRAVITY</span>
        </div>
        
        {/* Magic UI NL Input */}
        <NLInput />

        <div className="flex justify-end min-w-[160px]">
          {/* Starknet Wallet Connection */}
          <WalletConnect />
        </div>
      </header>

      {/* Split Screen Container */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        
        {/* Left Pane: Starknet Vault */}
        <div className="flex-1 relative border-r border-white/5 bg-gradient-to-br from-[#0a0a0f] to-starknet-blue/5 overflow-hidden flex flex-col items-center justify-center p-8">
          {/* Background Glow */}
          <div className="absolute top-1/4 -left-1/4 w-96 h-96 rounded-full bg-starknet-blue/20 blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 w-full max-w-md glass rounded-2xl p-8 border-starknet-blue/20">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-medium text-starknet-blue">STARKNET VAULT</h2>
              <span className={`text-xs px-2 py-1 rounded border ${connected ? 'bg-starknet-blue/20 border-starknet-blue text-starknet-blue' : 'bg-white/5 border-white/10 text-white/50'}`}>
                 {connected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
            
            <div className="space-y-6">
              <div>
                 <p className="text-sm text-white/50 uppercase tracking-widest mb-1">Available Balance</p>
                 <motion.h1 
                    layoutId="vault-balance"
                    className="text-4xl font-light font-mono"
                 >
                    ${formatBalance(balances.USDC)} <span className="text-xl text-white/30">USD</span>
                 </motion.h1>
              </div>
              
              {!connected && (
                 <p className="text-xs text-white/40 italic">Connect your wallet to provision a validium balance.</p>
              )}

              {connected && swipeStatus === 'idle' && (
                 <button 
                  onClick={triggerMockSwipe}
                  className="w-full py-4 rounded-xl bg-ai-purple/10 hover:bg-ai-purple/20 border border-ai-purple/50 text-ai-purple font-medium transition-colors shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                   Trigger Shadow Swipe (Demo)
                 </button>
              )}
            </div>
          </div>

          <div className="h-48 mt-8 shrink-0 w-full max-w-md">
              {swipeStatus !== 'idle' && (
                <SwipeProgress status={swipeStatus} bchTxId={bchTx} />
              )}
          </div>
        </div>

        {/* Right Pane: BCH Shadow Card */}
        <div className="flex-1 relative bg-gradient-to-bl from-[#0a0a0f] to-bch-green/5 overflow-hidden flex flex-col items-center justify-center p-8">
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
              <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${swipeStatus !== 'idle' ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-ai-purple/20 via-transparent to-bch-green/20" />
              </div>

              <div className="flex justify-between items-start relative z-10">
                <div className="w-12 h-8 rounded bg-yellow-500/20 border border-yellow-500/40 relative overflow-hidden">
                    {/* Chip lines */}
                    <div className="absolute top-1/2 left-0 w-full h-px bg-yellow-500/30" />
                    <div className="absolute top-0 left-1/2 w-px h-full bg-yellow-500/30" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs tracking-widest text-bch-green uppercase opacity-80 font-semibold drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">Shadow Protocol</span>
                    {swipeStatus !== 'idle' ? (
                        <div className="w-2 h-2 rounded-full bg-bch-green animate-ping" />
                    ) : (
                        <div className="w-2 h-2 rounded-full bg-bch-green/40" />
                    )}
                </div>
              </div>

              <div className="relative z-10 text-center">
                 <p className="text-sm text-white/40 mb-2 uppercase tracking-widest">Burner Active</p>
                 <div className="h-px w-24 bg-white/10 mx-auto mb-2" />
                 <p className="text-xs font-mono text-bch-green opacity-80 break-all px-4 truncate">
                    {burnerAddress ? burnerAddress : 'Initializing...'}
                 </p>
              </div>
              
              <div className="flex justify-between items-end relative z-10 font-mono text-sm opacity-60">
                <span>{burnerAddress ? burnerAddress.slice(12, 16) + ' ' + burnerAddress.slice(16, 20) + ' ' + burnerAddress.slice(20, 24) + ' ' + burnerAddress.slice(24, 28) : '____ ____ ____ ____'}</span>
                <span>0G</span>
              </div>
            </motion.div>
          </div>
        </div>
        
      </div>
    </main>
  );
}
