import { useState, useEffect, useCallback } from 'react';
import { connect, disconnect } from '@argent/get-starknet';
import { RpcProvider, Contract, cairo } from 'starknet';
import { useVaultStore } from '../stores/vaultStore';

// Sepolia testnet constants
const RPC_URL = process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://free-rpc.nethermind.io/sepolia-juno/';
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS || '0x0';

// Initialize provider 
const provider = new RpcProvider({ nodeUrl: RPC_URL });

export function useVault() {
  const { connected, address, setConnected, updateBalances } = useVaultStore();
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Basic refresh balance function
  const refreshBalance = useCallback(async (walletAddress: string) => {
    if (VAULT_ADDRESS === '0x0') return;
    try {
      // In a real app, we'd read from the vault contract:
      // const vaultContract = new Contract(vaultAbi, VAULT_ADDRESS, provider);
      // const bal = await vaultContract.get_balance(walletAddress);
      
      // For now, mock a balance of 500 USDC for the demo if connected
      updateBalances({ 
        USDC: 500_000_000n, // 500 USDC (6 decimals)
        ETH: 0n 
      });
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  }, [updateBalances]);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const starknet = await connect({ modalMode: "alwaysAsk", modalTheme: "dark" });
      if (starknet && starknet.isConnected) {
        setConnected(true, starknet.selectedAddress);
        await refreshBalance(starknet.selectedAddress);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect();
      setConnected(false, null);
      updateBalances({ USDC: 0n, ETH: 0n });
    } catch (err) {
      console.error("Disconnect failed:", err);
    }
  };

  // Re-connect silently on mount if already authorized
  useEffect(() => {
    const tryEagerConnect = async () => {
      const starknet = await connect({ modalMode: "neverAsk" });
      if (starknet && starknet.isConnected) {
        setConnected(true, starknet.selectedAddress);
        refreshBalance(starknet.selectedAddress);
      }
    };
    tryEagerConnect();
  }, [setConnected, refreshBalance]);

  return {
    connected,
    address,
    isConnecting,
    connectWallet,
    disconnectWallet,
    refreshBalance
  };
}
