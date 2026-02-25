import { useState, useEffect, useCallback } from 'react';
import { connect, disconnect } from '@argent/get-starknet';
import { RpcProvider, Contract, cairo, CallData } from 'starknet';
import { useVaultStore } from '../stores/vaultStore';

// Sepolia testnet constants
const RPC_URL = process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://free-rpc.nethermind.io/sepolia-juno/';
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS || '0x07e2f9fae965077e6c47938112dfd15ba4b2aa776d75661b40b8bacc3c3f57cb';

// Token Addresses (Sepolia)
const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const USDC_ADDRESS = '0x053c91253695913a87d95d1bd30c2d61585543cc85a96057c17c46927f8aadb5';

// Minimized ABIs for balance fetching
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "felt" }],
    outputs: [{ name: "balance", type: "Uint256" }],
    state_mutability: "view",
  },
];

const VAULT_ABI = [
  {
    name: "get_balance",
    type: "function",
    inputs: [{ name: "user", type: "felt" }],
    outputs: [{ name: "balance", type: "Uint256" }],
    state_mutability: "view",
  },
  {
    name: "deposit",
    type: "function",
    inputs: [{ name: "amount", type: "Uint256" }],
    outputs: [],
    state_mutability: "external",
  }
];

export function useVault() {
  const { connected, address, setConnected, updateBalances } = useVaultStore();
  const [isConnecting, setIsConnecting] = useState(false);

  // Helper to safely extract BigInt from a Uint256 response or raw bigint
  const extractBigInt = (val: any): bigint => {
    if (typeof val === 'bigint') return val;
    if (val && typeof val === 'object' && 'low' in val) {
      // It's a Uint256 object { low, high }
      return (BigInt(val.high) << 128n) + BigInt(val.low);
    }
    return BigInt(val || 0);
  };
  
  // Refresh real on-chain balances
  const refreshBalance = useCallback(async (walletAddress: string) => {
    if (VAULT_ADDRESS === '0x0' || !walletAddress) return;
    try {
      const provider = new RpcProvider({ nodeUrl: RPC_URL });
      
      // Fetch STRK Balance
      const strkContract = new Contract(ERC20_ABI, STRK_ADDRESS, provider);
      const strkBalance = await strkContract.balanceOf(walletAddress);
      
      // Fetch Vault Balance (USDC equivalent in the protocol)
      const vaultContract = new Contract(VAULT_ABI, VAULT_ADDRESS, provider);
      const vaultBalance = await vaultContract.get_balance(walletAddress);
      
      // Update store
      updateBalances({ 
        USDC: extractBigInt(vaultBalance.balance || vaultBalance),
        ETH: 0n,
        STRK: extractBigInt(strkBalance.balance || strkBalance)
      });
      
      console.log(`✅ [RPC Balance Sync] Vault: ${extractBigInt(vaultBalance.balance || vaultBalance)}, STRK: ${extractBigInt(strkBalance.balance || strkBalance)}`);
    } catch (err: any) {
      console.warn("⚠️ Balance Fetch Issue (Likely RPC congestion):", err.message || err);
    }
  }, [updateBalances]);

  // Auto-sync when address is available
  useEffect(() => {
    if (address && connected) {
      refreshBalance(address);
    }
  }, [address, connected, refreshBalance]);

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
      updateBalances({ USDC: 0n, ETH: 0n, STRK: 0n });
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

  const requestSwipe = async (amountUsd: number, bchAddress: string, memo: string) => {
    if (!VAULT_ADDRESS || VAULT_ADDRESS === '0x0') {
      throw new Error("Vault address not configured");
    }

    try {
      const starknet = await connect({ modalMode: "neverAsk" });
      if (!starknet || !starknet.isConnected || !starknet.account) {
        throw new Error("Wallet not connected");
      }

      const account = starknet.account;
      
      // Constants for 0G Protocol
      const USDC_DECIMALS = 6;
      const amountRaw = BigInt(Math.floor(amountUsd * Math.pow(10, USDC_DECIMALS)));
      
      // Convert BCH address to Felt (placeholder logic - simplified for demo)
      // In a real app we'd use a more robust hash conversion
      const bchAddressFelt = BigInt("0x" + Buffer.from(bchAddress).toString("hex").substring(0, 60));

      console.log(`Initiating swipe: $${amountUsd} to ${bchAddress}`);

      const call = {
        contractAddress: VAULT_ADDRESS,
        entrypoint: "request_swipe",
        calldata: CallData.compile({
          amount: cairo.uint256(amountRaw),
          bch_target: bchAddressFelt.toString()
        })
      };

      // Winning Edge: Intelligent Gas Selection
      // If user has 0 ETH but has STRK, we force version 3 (STRK fees)
      const { balances } = useVaultStore.getState();
      const txVersion = (balances.ETH === 0n && balances.STRK > 0n) ? 3 : 1;
      
      console.log(`Executing with TX Version: ${txVersion} (Reason: ${txVersion === 3 ? 'STRK Gas' : 'Standard Gas'})`);

      const result = await account.execute(call, undefined, { version: txVersion });
      console.log("Transaction submitted:", result.transaction_hash);
      
      // Refresh balance after transaction (after a short delay for indexing)
      setTimeout(() => refreshBalance(account.address), 5000);
      
      return result;
    } catch (err) {
      console.error("Request swipe failed:", err);
      throw err;
    }
  };

  const depositFunds = async (amountUsd: number) => {
    if (!VAULT_ADDRESS || VAULT_ADDRESS === '0x0') throw new Error("Vault not configured");
    
    try {
      const starknet = await connect({ modalMode: "neverAsk" });
      if (!starknet || !starknet.isConnected || !starknet.account) throw new Error("Wallet not connected");

      const account = starknet.account;
      const USDC_DECIMALS = 6;
      const amountRaw = BigInt(Math.floor(amountUsd * Math.pow(10, USDC_DECIMALS)));

      console.log(`Depositing $${amountUsd} into Vault...`);

      const call = {
        contractAddress: VAULT_ADDRESS,
        entrypoint: "deposit",
        calldata: CallData.compile({
          amount: cairo.uint256(amountRaw)
        })
      };

      const result = await account.execute(call);
      console.log("Deposit submitted:", result.transaction_hash);
      
      setTimeout(() => refreshBalance(account.address), 5000);
      return result;
    } catch (err) {
      console.error("Deposit failed:", err);
      throw err;
    }
  };

  return {
    connected,
    address,
    isConnecting,
    connectWallet,
    disconnectWallet,
    refreshBalance,
    requestSwipe,
    depositFunds
  };
}
