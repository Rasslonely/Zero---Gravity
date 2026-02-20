"use client";

import { motion } from "framer-motion";
import { useVault } from "../hooks/useVault";

export function WalletConnect() {
  const { connected, address, isConnecting, connectWallet, disconnectWallet } = useVault();

  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (connected && address) {
    return (
      <motion.div
        layoutId="wallet-button"
        whileTap={{ scale: 0.98 }}
        onClick={disconnectWallet}
        className="h-10 px-5 rounded-full border border-starknet-blue/50 bg-starknet-blue/10 backdrop-blur-md flex items-center gap-3 hover:bg-starknet-blue/20 cursor-pointer transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] group"
      >
        <div className="w-2 h-2 rounded-full bg-starknet-blue animate-pulse shadow-[0_0_8px_rgba(99,102,241,1)]" />
        <span className="text-sm font-mono text-starknet-blue tracking-wide group-hover:text-white transition-colors">
          {truncateAddress(address)}
        </span>
      </motion.div>
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
