"use client";

import { motion } from "framer-motion";
import { WalletConnect } from "../components/WalletConnect";
import { NLInput } from "../components/NLInput";
import { useBchWallet } from "../hooks/useBchWallet";
import { useVaultStore } from "../stores/vaultStore";
import { useVault } from "../hooks/useVault";
import { useRealtime } from "../hooks/useRealtime";
import { SwipeProgress } from "../components/SwipeProgress";
import { ShadowCard } from "../components/ShadowCard";
import { useState, useMemo } from "react";
import { SwipeStatus } from "../hooks/useRealtime";
import { CheckCircle2, Receipt, Loader2 } from "lucide-react";

interface Intent {
  amount: number;
  currency: string;
  memo: string;
  confidence: number;
}

export default function Home() {
  const { burnerAddress } = useBchWallet();
  const { balances, connected, address } = useVaultStore();
  const { requestSwipe, depositFunds } = useVault();
  
  // Real-time protocol state tracking
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const { status: protocolStatus, bchTxId: liveBchTx, setStatus: setProtocolStatus } = useRealtime(activeSwipeId, address);
  
  const [bchTx, setBchTx] = useState<string | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);
  const [refillInput, setRefillInput] = useState("10");

  // Sync protocol status to local UI state for animations
  const swipeStatus = protocolStatus;
  const currentBchTx = liveBchTx || bchTx;

  const formatBalance = (amount: bigint, decimals = 6) => {
    // Basic formatting
    const num = Number(BigInt(amount)) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSwipeIntent = async (intent: Intent) => {
    if (!burnerAddress) return;
    
    setProtocolStatus('locking');
    try {
      const result: any = await requestSwipe(intent.amount, burnerAddress, intent.memo);
      console.log("Starknet TX submitted:", result.transaction_hash);
      
      // The bridge now returns the internal Supabase ID
      if (result.swipeId) {
        console.log("Tracking Protocol Lifecycle for ID:", result.swipeId);
        setActiveSwipeId(result.swipeId);
      }
      
    } catch (err: any) {
      setProtocolStatus('failed');
      console.error("Swipe flow interrupted:", err);
    }
  };

  const triggerMockSwipe = () => {
    handleSwipeIntent({
      amount: 5,
      currency: 'USD',
      memo: 'Manual Shadow Swipe',
      confidence: 1.0
    });
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
        <div className="flex items-center gap-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <img 
              src="/zero-gravity.png" 
              alt="Zero-Gravity Logo" 
              className="w-12 h-12 object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] drop-shadow-[0_0_15px_rgba(99,102,241,0.2)]"
            />
          </motion.div>
          <motion.span 
             initial={{ opacity: 0, x: -10 }}
             animate={{ opacity: 1, x: 0 }}
             className="font-semibold tracking-[0.3em] hidden md:block text-sm bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60"
          >
             ZERO-GRAVITY
          </motion.span>
        </div>
        
        {/* Magic UI NL Input */}
        <div className="flex-1 flex justify-center max-w-2xl mx-12">
           <NLInput onConfirm={handleSwipeIntent} />
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
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-xs text-white/40 uppercase tracking-[0.3em] mb-2 font-medium">Vault Balance</p>
                      <motion.h1 
                         layoutId="vault-balance"
                         className="text-5xl font-light font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70"
                      >
                         ${formatBalance(balances.USDC)} <span className="text-2xl text-white/30 tracking-normal ml-1">USDC</span>
                      </motion.h1>
                   </div>
                   <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[8px] text-white/40 uppercase tracking-tighter font-medium">Live Sync</span>
                   </div>
                </div>


                
                {!connected && (
                   <p className="text-sm text-starknet-blue/60 leading-relaxed font-light mt-4">Connect your Starknet wallet to access your validium liquidity.</p>
                )}

                {connected && swipeStatus === 'idle' && (
                  <div className="space-y-4 mt-6">
                    {/* Shadow Swipe Button */}
                    <button 
                      onClick={triggerMockSwipe}
                      className="w-full py-4 rounded-2xl bg-starknet-blue/10 hover:bg-starknet-blue/20 border border-starknet-blue/30 text-starknet-blue font-semibold tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] flex items-center justify-center gap-3">
                       <span className="w-2 h-2 rounded-full bg-starknet-blue animate-pulse" />
                       Shadow Swipe
                    </button>

                    {/* Pro Refill UI (E-Wallet Style) */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold">Top-up Vault</span>
                        <div className="flex items-center gap-2">
                           <div className="w-1 h-1 rounded-full bg-starknet-blue animate-pulse" />
                           <span className="text-[9px] text-starknet-blue/80 font-mono">Available: {formatBalance(balances.STRK, 18)} STRK</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1 group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs font-mono group-focus-within:text-starknet-blue transition-colors">$</span>
                          <input 
                            type="number"
                            value={refillInput}
                            onChange={(e) => setRefillInput(e.target.value)}
                            className="w-full h-12 bg-black/60 border border-white/5 rounded-xl pl-8 pr-3 text-sm text-white focus:outline-none focus:border-starknet-blue/30 focus:bg-black/80 transition-all font-mono"
                            placeholder="Amount"
                          />
                        </div>
                        <button 
                          disabled={isDepositing || !refillInput}
                          onClick={async () => {
                            const val = parseFloat(refillInput);
                            if (isNaN(val) || val <= 0) return;
                            setIsDepositing(true);
                            try { await depositFunds(val); } catch(e) {}
                            setIsDepositing(false);
                          }}
                          className="px-6 h-12 rounded-xl bg-starknet-blue/20 hover:bg-starknet-blue/30 border border-starknet-blue/30 text-white font-bold text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center min-w-[100px] uppercase">
                          {isDepositing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deposit"}
                        </button>
                      </div>
                      <p className="text-[9px] text-white/20 leading-relaxed italic opacity-60">
                        Funds are moved from your personal Starknet wallet into the 0G Protocol Vault for instant, gas-free swipes.
                      </p>
                    </div>
                  </div>
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
               <SwipeProgress status={swipeStatus} bchTxId={currentBchTx} />
            </div>
        </div>
      )}

      {/* Merchant Receipt Confirmation (Winning Edge UI) */}
      {swipeStatus === 'confirmed' && (
        <motion.div 
           initial={{ opacity: 0, scale: 0.9, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           className="absolute bottom-10 right-10 z-[60] glass p-6 rounded-2xl border-bch-green/30 shadow-[0_0_40px_rgba(34,197,94,0.15)] flex flex-col gap-4 max-w-xs"
        >
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-bch-green/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-bch-green" />
             </div>
             <div>
                <h3 className="font-bold text-sm tracking-tight">PAYMENT RECEIVED</h3>
                <p className="text-[10px] text-white/40 font-mono italic">0x{currentBchTx?.substring(0, 12)}...</p>
             </div>
          </div>
          <div className="h-px bg-white/5 w-full" />
          <div className="flex justify-between items-center text-xs">
             <span className="text-white/40 flex items-center gap-1"><Receipt className="w-3 h-3" /> Merchant ID</span>
             <span className="font-mono text-bch-green">COFFEE-SHOP-01</span>
          </div>
          <button 
             onClick={() => { setProtocolStatus('idle'); setBchTx(null); }}
             className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[11px] font-medium transition-colors"
          >
             Dismiss Receipt
          </button>
        </motion.div>
      )}
    </main>
  );
}
