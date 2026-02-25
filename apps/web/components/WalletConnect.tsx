"use client";

import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { LogOut, Copy, ExternalLink } from "lucide-react";
import { useVault } from "../hooks/useVault";

export function WalletConnect() {
  const { connected, address, isConnecting, connectWallet, disconnectWallet } = useVault();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (connected && address) {
    return (
      <div className="relative" ref={menuRef}>
        <motion.div
           layoutId="wallet-button"
           whileTap={{ scale: 0.98 }}
           onClick={() => setShowMenu(!showMenu)}
           className="h-10 px-5 rounded-full border border-starknet-blue/50 bg-starknet-blue/10 backdrop-blur-md flex items-center gap-3 hover:bg-starknet-blue/20 cursor-pointer transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] group"
        >
           <div className="w-2 h-2 rounded-full bg-starknet-blue animate-pulse shadow-[0_0_8px_rgba(99,102,241,1)]" />
           <span className="text-sm font-mono text-starknet-blue tracking-wide group-hover:text-white transition-colors">
             {truncateAddress(address)}
           </span>
        </motion.div>

        {showMenu && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute right-0 mt-3 w-56 p-2 rounded-2xl bg-[#0d0d12] border border-white/10 shadow-2xl backdrop-blur-xl z-[100]"
          >
            <div className="p-3 border-b border-white/5 mb-1">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Account</p>
                <span className="px-1.5 py-0.5 rounded-sm bg-starknet-blue/20 text-starknet-blue text-[8px] font-bold uppercase">Sepolia</span>
              </div>
              <p className="text-xs font-mono text-white/80" title={address}>
                {truncateAddress(address)}
              </p>
            </div>
            
            <button 
              onClick={() => {
                navigator.clipboard.writeText(address);
                setShowMenu(false);
              }}
              className="w-full h-10 px-3 rounded-lg hover:bg-white/5 flex items-center gap-3 text-xs text-white/60 hover:text-white transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copy Address
            </button>

            <a 
              href={`https://sepolia.voyager.online/contract/${address}`}
              target="_blank"
              rel="noreferrer"
              className="w-full h-10 px-3 rounded-lg hover:bg-white/5 flex items-center gap-3 text-xs text-white/60 hover:text-white transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> View on Voyager
            </a>

            <button 
              onClick={() => {
                disconnectWallet();
                setShowMenu(false);
              }}
              className="w-full h-10 px-3 mt-1 rounded-lg hover:bg-red-500/10 flex items-center gap-3 text-xs text-red-400 hover:text-red-300 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <motion.button
      layoutId="wallet-button"
      whileTap={{ scale: 0.98 }}
      onClick={connectWallet}
      disabled={isConnecting}
      className={`h-10 px-6 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-2 transition-all duration-300 font-medium tracking-wide ${
        isConnecting 
          ? "bg-white/5 cursor-wait text-white/50" 
          : "hover:bg-white/10 cursor-pointer hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
      }`}
    >
      <span className="text-sm">
        {isConnecting ? "Connecting..." : "Connect Vault"}
      </span>
    </motion.button>
  );
}
