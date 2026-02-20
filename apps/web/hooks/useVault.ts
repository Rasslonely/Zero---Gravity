import { useState, useEffect, useCallback } from 'react';
import { connect, disconnect } from '@argent/get-starknet';
import { RpcProvider, Contract, cairo } from 'starknet';
import { useVaultStore } from '../stores/vaultStore';

// Sepolia testnet constants
const RPC_URL = process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://free-rpc.nethermind.io/sepolia-juno/';
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS || '0x0';

// Initialize provider lazily inside hooks or functions, not globally, to prevent SSR crashes on Vercel/Localhost if the RPC is down.
// let provider: RpcProvider | null = null;

export function useVault() {
  const { connected, address, setConnected, updateBalances } = useVaultStore();
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Basic refresh balance function
  const refreshBalance = useCallback(async (walletAddress: string) => {
    if (VAULT_ADDRESS === '0x0') return;
    try {
      // In a real app, we'd read from the vault contract:
      // const provider = new RpcProvider({ nodeUrl: RPC_URL });
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
    
    // Safety timeout in case modal hangs or user closes extension without rejecting promise
    const timeoutId = setTimeout(() => {
        setIsConnecting(false);
    }, 15000);

    try {
      // Use 'canAsk' and wrap in a race to prevent the modal promise from hanging infinitely
      const starknet: any = await Promise.race([
        connect({ modalMode: "canAsk" }),
        new Promise((resolve) => setTimeout(() => resolve(null), 3000))
      ]);
      
      if (starknet && starknet.isConnected) {
        setConnected(true, starknet.selectedAddress);
        await refreshBalance(starknet.selectedAddress);
      } else {
        // Fallback: Check if window.starknet exists directly in case the library modal is failing
        if (typeof window !== 'undefined' && (window as any).starknet) {
           const fallbackStarknet = (window as any).starknet;
           // Explicitly ask for v5 API or let it default to latest, because v4 is deprecated
           await fallbackStarknet.enable({ starknetVersion: "v5" });
           if (fallbackStarknet.isConnected) {
             setConnected(true, fallbackStarknet.selectedAddress);
             await refreshBalance(fallbackStarknet.selectedAddress);
             setIsConnecting(false);
             clearTimeout(timeoutId);
             return;
           }
        }
        console.warn("User closed modal or no wallet found.");
        setIsConnecting(false);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setIsConnecting(false);
    } finally {
      clearTimeout(timeoutId);
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
      try {
        const starknet = await connect({ modalMode: "neverAsk" });
        if (starknet && starknet.isConnected) {
          setConnected(true, starknet.selectedAddress);
          refreshBalance(starknet.selectedAddress);
        }
      } catch (err) {
        console.warn("Eager connect skipped:", err);
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
