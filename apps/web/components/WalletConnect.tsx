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
        className="h-10 px-4 rounded-full border border-starknet-blue/50 bg-starknet-blue/10 flex items-center gap-2 hover:bg-starknet-blue/20 cursor-pointer transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)]"
      >
        <div className="w-2 h-2 rounded-full bg-starknet-blue animate-pulse" />
        <span className="text-sm font-mono text-starknet-blue">{truncateAddress(address)}</span>
      </motion.div>
    );
  }

  return (
    <motion.button
      layoutId="wallet-button"
      whileTap={{ scale: 0.98 }}
      onClick={connectWallet}
      disabled={isConnecting}
      className={`h-10 px-4 rounded-full border border-white/10 flex items-center gap-2 transition-colors ${
        isConnecting ? "bg-white/5 cursor-wait" : "hover:bg-white/5 cursor-pointer"
      }`}
    >
      <span className="text-sm">
        {isConnecting ? "Connecting..." : "Connect"}
      </span>
    </motion.button>
  );
}
