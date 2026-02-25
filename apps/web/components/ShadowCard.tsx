"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { MouseEvent } from "react";
import { SwipeStatus } from "../hooks/useRealtime";

interface ShadowCardProps {
  swipeStatus: SwipeStatus;
  burnerAddress: string | null;
}

export function ShadowCard({ swipeStatus, burnerAddress }: ShadowCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={{ scale: 1.02, rotateY: 5, rotateX: 5 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="w-[380px] h-[240px] rounded-2xl glass border-bch-green/20 p-6 flex flex-col justify-between relative overflow-hidden backdrop-blur-3xl bg-[#0a0a0f]/60 shrink-0 shadow-2xl group"
      style={{ perspective: 1000 }}
    >
      {/* Holographic Reactive Overlay */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-500 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              rgba(34, 197, 94, 0.15),
              transparent 40%
            )
          `,
        }}
      />

      {/* Swipe Status Gradient */}
      <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${swipeStatus !== 'idle' ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-ai-purple/10 via-transparent to-bch-green/20" />
      </div>

      <div className="flex justify-between items-start relative z-10">
        <div className="w-12 h-8 rounded bg-yellow-500/20 border border-yellow-500/40 relative overflow-hidden shadow-[0_0_10px_rgba(234,179,8,0.2)]">
            <div className="absolute top-1/2 left-0 w-full h-px bg-yellow-500/30" />
            <div className="absolute top-0 left-1/2 w-px h-full bg-yellow-500/30" />
            
            {/* Blinking chip detail when active */}
            {swipeStatus !== 'idle' && swipeStatus !== 'confirmed' && swipeStatus !== 'failed' && (
              <div className="absolute inset-0 bg-yellow-500/30 animate-pulse mix-blend-screen" />
            )}
        </div>
        <div className="flex items-center gap-2">
            <span className="text-xs tracking-widest text-bch-green uppercase opacity-80 font-semibold drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">Shadow Protocol</span>
            {swipeStatus !== 'idle' && swipeStatus !== 'confirmed' ? (
                <div className="w-2 h-2 rounded-full bg-bch-green animate-ping" />
            ) : swipeStatus === 'confirmed' ? (
                <div className="w-2 h-2 rounded-full bg-bch-green shadow-[0_0_10px_rgba(34,197,94,1)]" />
            ) : (
                <div className="w-2 h-2 rounded-full bg-bch-green/40" />
            )}
        </div>
      </div>

      <div className="relative z-10 text-center">
         <p className="text-sm text-white/40 mb-2 uppercase tracking-widest transition-colors">
             {swipeStatus === 'idle' ? 'Burner Active' : swipeStatus === 'confirmed' ? 'Swipe Confirmed' : 'Processing...'}
         </p>
         <div className={`h-px w-24 mx-auto mb-2 transition-colors ${swipeStatus === 'confirmed' ? 'bg-bch-green/50' : 'bg-white/10'}`} />
         <p className="text-xs font-mono text-bch-green opacity-80 break-all px-4 truncate transition-all duration-300">
            {burnerAddress ? burnerAddress : 'Initializing...'}
         </p>
      </div>
      
      <div className="flex justify-between items-end relative z-10 font-mono text-sm opacity-60">
        <span>{burnerAddress ? burnerAddress.slice(12, 16) + ' ' + burnerAddress.slice(16, 20) + ' ' + burnerAddress.slice(20, 24) + ' ' + burnerAddress.slice(24, 28) : '____ ____ ____ ____'}</span>
        <img 
          src="/zero-gravity.png" 
          alt="0G" 
          className="w-5 h-5 object-contain opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 filter drop-shadow-[0_0_5px_rgba(34,197,94,0.4)]" 
        />
      </div>
    </motion.div>
  );
}
