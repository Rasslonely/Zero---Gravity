import { useState, useEffect, useCallback } from 'react';
import { connect, disconnect } from '@argent/get-starknet';
import { RpcProvider, Contract, cairo, CallData } from 'starknet';
import { useVaultStore } from '../stores/vaultStore';
import { supabase } from '../lib/supabase';

// Sepolia testnet constants (Protocol Addresses)
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS || '0x07e2f9fae965077e6c47938112dfd15ba4b2aa776d75661b40b8bacc3c3f57cb';
const STRK_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const USDC_ADDRESS = '0x053c91253695913a87d95d1bd30c2d61585543cc85a96057c17c46927f8aadb5';

// Minimized ABIs for balance fetching (Compatible with starknet.js v5)
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

// Global cache to avoid React closure bugs and Zustand serialization issues
let activeWallet: any = null;

export function useVault() {
  const { connected, address, setConnected, updateBalances } = useVaultStore();
  const [isConnecting, setIsConnecting] = useState(false);

  // Helper to safely extract BigInt from any Starknet response type (v4, v5, bigint, object, array)
  const extractBigInt = (val: any): bigint => {
    if (typeof val === 'bigint') return val;
    if (val === null || val === undefined) return 0n;
    
    // Array response from raw callContract (e.g. ['low', 'high'])
    if (Array.isArray(val)) {
      if (val.length >= 2 && typeof val[0] !== 'object') {
        return (BigInt(val[1]) << 128n) + BigInt(val[0]);
      }
      if (val.length > 0) return extractBigInt(val[0]);
    }

    if (typeof val === 'object') {
      // Uint256: { low, high }
      if ('low' in val && 'high' in val) {
        return (BigInt(val.high) << 128n) + BigInt(val.low);
      }
      // Result object: { balance: ... } or { result: ... } or { 0: ... }
      const nested = val.balance ?? val.result ?? val[0];
      if (nested !== undefined) return extractBigInt(nested);
    }

    try {
      return BigInt(val);
    } catch (e) {
      return 0n;
    }
  };
  
  // Refresh real on-chain balances (Raw Call to bypass ABIs)
  const refreshBalance = useCallback(async (walletAddress: string) => {
    if (VAULT_ADDRESS === '0x0' || !walletAddress) return;
    
    try {
      if (!activeWallet || !activeWallet.provider) {
        console.warn("⚠️ Cannot sync balance: Wallet provider missing from active session");
        return;
      }

      const provider = activeWallet.provider;
      
      // Fetch STRK Balance via RAW call (Immune to ABI validation bugs)
      // starknet.js v5/v6 callContract returns an Array of strings directly: ['0x12', '0x0']
      const strkRes = await provider.callContract({
        contractAddress: STRK_ADDRESS,
        entrypoint: "balanceOf",
        calldata: CallData.compile([walletAddress])
      });
      console.log("Raw STRK Call:", strkRes);
      // strkRes is the array itself in modern starknet.js, or an object with .result in older versions
      const strkData = Array.isArray(strkRes) ? strkRes : (strkRes as any).result;
      const strkVal = extractBigInt(strkData);
      
      // Fetch Vault Balance via RAW call
      const vaultRes = await provider.callContract({
        contractAddress: VAULT_ADDRESS,
        entrypoint: "get_balance",
        calldata: CallData.compile([walletAddress])
      });
      console.log("Raw Vault Call:", vaultRes);
      const vaultData = Array.isArray(vaultRes) ? vaultRes : (vaultRes as any).result;
      const vaultVal = extractBigInt(vaultData);

      // Update store
      updateBalances({ 
        USDC: vaultVal,
        ETH: 0n,
        STRK: strkVal
      });
      
      console.log(`✅ [Wallet Provider] Parsed Balances: Vault: ${vaultVal}, STRK: ${strkVal}`);
    } catch (err: any) {
      console.warn(`⚠️ Balance sync failed via Wallet:`, err.message || err);
    }
  }, [updateBalances]);

  // Auto-sync when address is available
  useEffect(() => {
    if (address && connected) {
      refreshBalance(address);
      const intervalId = setInterval(() => refreshBalance(address), 15000);
      return () => clearInterval(intervalId);
    }
  }, [address, connected, refreshBalance]);

  const connectWallet = async () => {
    setIsConnecting(true);
    
    // Safety timeout in case modal hangs or user closes extension without rejecting promise
    const timeoutId = setTimeout(() => {
        setIsConnecting(false);
    }, 15000);

    try {
      // Connect and handle the initial handshake.
      const starknet = await connect({ modalMode: "alwaysAsk" });
      clearTimeout(timeoutId);

      // Simple address extraction without v4 fallback loops
      let addr = starknet?.selectedAddress;
      
      // Ready Wallet (Argent X) Async Handshake Fix
      if (starknet && starknet.isConnected && !addr) {
        console.log("⏳ Wallet connected, but address pending... polling (max 5s)");
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 500));
          if (starknet.selectedAddress) {
            addr = starknet.selectedAddress;
            break;
          }
        }
      }

      if (starknet && starknet.isConnected && addr) {
        localStorage.removeItem('ZG_LOGGED_OUT');
        activeWallet = starknet; 
        setConnected(true, addr);

        // Ensure user exists in Supabase (The Bridge Foundation)
        if (supabase) {
          try {
            const { data: user, error: fetchErr } = await supabase
              .from('users')
              .select('id')
              .eq('starknet_address', addr)
              .single();

            if (fetchErr && fetchErr.code === 'PGRST116') {
              console.log("🆕 Registering new user in Supabase:", addr);
              await supabase.from('users').insert({ starknet_address: addr });
            }
          } catch (dbErr) {
            console.warn("⚠️ Supabase auto-registration failed:", dbErr);
          }
        }

        setTimeout(() => refreshBalance(addr), 500);
        setTimeout(() => refreshBalance(addr), 2500);
      } else {
        console.warn("Wallet session failed or user rejected.");
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
      localStorage.setItem('ZG_LOGGED_OUT', 'true');
      activeWallet = null;
      setConnected(false, null);
      updateBalances({ USDC: 0n, ETH: 0n, STRK: 0n });
    } catch (err) {
      console.error("Disconnect failed:", err);
    }
  };

  // Re-connect silently on mount if already authorized
  useEffect(() => {
    const tryEagerConnect = async () => {
      // Don't auto-connect if the user explicitly logged out
      if (localStorage.getItem('ZG_LOGGED_OUT') === 'true') {
        return;
      }

      // Delay eager connect slightly to let the page settle
      await new Promise(r => setTimeout(r, 1000));
      try {
        const starknet = await connect({ modalMode: "neverAsk" });
        if (starknet && starknet.isConnected) {
          activeWallet = starknet;
          setConnected(true, starknet.selectedAddress as string);
          // Wait for connection to be stable before refresh
          setTimeout(() => refreshBalance(starknet.selectedAddress as string), 500);
        }
      } catch (err) {
        console.warn("Eager connect skipped:", err);
      }
    };
    tryEagerConnect();
  }, []); // Only run once on mount

  const requestSwipe = async (amountUsd: number, bchAddress: string, memo: string) => {
    if (!VAULT_ADDRESS || VAULT_ADDRESS === '0x0') {
      throw new Error("Vault address not configured");
    }

    try {
      // 0. Connect with Timeout Watchdog
      const starknet = await Promise.race([
        connect({ modalMode: "neverAsk" }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("WALLET_TIMEOUT")), 15000))
      ]);

      if (!activeWallet || !activeWallet.isConnected || !activeWallet.account) {
        throw new Error("Wallet not connected");
      }

      const account = activeWallet.account;
      const { balances } = useVaultStore.getState();
      const formatVaultBalance = (amount: bigint) => (Number(amount) / 1_000_000).toFixed(2);
      
      // Constants for 0G Protocol
      const USDC_DECIMALS = 6;
      const amountRaw = BigInt(Math.floor(amountUsd * Math.pow(10, USDC_DECIMALS)));
      
      // 0. Pre-flight Balance Check (Prevents Dropped Transactions)
      if (balances.USDC < amountRaw) {
        throw new Error(`INSUFFICIENT_VAULT_BALANCE: You need $${amountUsd} in Vault, but have $${formatVaultBalance(balances.USDC)}`);
      }

      // Convert BCH address to Felt (placeholder logic - simplified for demo)
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
      const txVersion = (balances.ETH === 0n && balances.STRK > 0n) ? 3 : 1;
      
      // 1. Execute with Timeout Watchdog
      const result = await Promise.race([
        account.execute(call, undefined, { version: txVersion }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("EXECUTE_TIMEOUT")), 60000))
      ]);

      if (!result) throw new Error("TRANSACTION_FAILED");

      console.log("Transaction submitted:", result.transaction_hash);
      
      let finalSwipeId = null;

      // 2. THE FAST BRIDGE: Register intent in Supabase IMMEDIATELLY so Oracle sees it
      // Don't wait for L2 finality to start the Oracle clock!
      if (supabase && account.address) {
        try {
          // Get the internal UUID for the user
          let { data: user, error: fetchErr } = await supabase
            .from('users')
            .select('id')
            .eq('starknet_address', account.address)
            .single();

          // Auto-register if missing (can happen on eager connection)
          if (fetchErr && fetchErr.code === 'PGRST116') {
             console.log("🆕 Auto-registering user in Supabase before swipe...");
             const { data: newUser, error: insertErr } = await supabase
                 .from('users')
                 .insert({ starknet_address: account.address })
                 .select('id')
                 .single();
             if (insertErr) throw insertErr;
             user = newUser;
          } else if (fetchErr) {
             throw fetchErr;
          }

          if (user) {
            console.log("🌉 Bridging Starknet TX to Supabase...");
            const { data: swipe, error: bridgeErr } = await supabase
              .from('swipes')
              .insert({
                user_id: user.id,
                amount_usd: amountUsd,
                amount_bch: amountUsd * 0.00015, // Approximate fee logic for demo
                bch_recipient: bchAddress,
                nonce: Date.now(), // Unique intent nonce
                status: 'PENDING',
                starknet_tx_hash: result.transaction_hash,
                memo: memo
              })
              .select('id')
              .single();

            if (bridgeErr) throw bridgeErr;
            console.log("✅ Bridge successful. Swipe ID:", swipe.id);
            finalSwipeId = swipe.id;
          }
        } catch (dbErr) {
          console.error("❌ Protocol Bridge Failure:", dbErr);
        }
      }

      // 3. Transaction Monitor (CORS-Safe L2 Watcher)
      // This now runs asynchronously so the UI can proceed immediately!
      const monitorStatus = async () => {
        let attempts = 0;
        const maxAttempts = 30; 
        
        while (attempts < maxAttempts) {
          try {
            if (!activeWallet || !activeWallet.provider) break;

            const receipt: any = await activeWallet.provider.getTransactionReceipt(result.transaction_hash);
            const status = receipt.status || receipt.finality_status;
            
            if (status === 'REJECTED' || status === 'REVERTED') {
              console.error("❌ Transaction failed on-chain:", status);
              // Optimally we'd update Supabase here to FAILED
              return;
            }
            if (status === 'ACCEPTED_ON_L2' || status === 'ACCEPTED_ON_L1') {
              console.log("✅ Transaction finalized on L2");
              return;
            }
          } catch (e) {}
          await new Promise(r => setTimeout(r, 10000));
          attempts++;
        }
      };
      
      // Fire and forget the monitor
      monitorStatus(); 
      setTimeout(() => refreshBalance(account.address), 5000);

      // Return immediately so the UI Progress Bar starts ticking!
      return { ...result, swipeId: finalSwipeId };
    } catch (err) {
      console.error("Request swipe failed:", err);
      throw err;
    }
  };

  const depositFunds = async (amountUsd: number) => {
    if (!VAULT_ADDRESS || VAULT_ADDRESS === '0x0') throw new Error("Vault not configured");
    
    try {
      if (!activeWallet || !activeWallet.isConnected || !activeWallet.account) throw new Error("Wallet not connected");

      const account = activeWallet.account;
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

      const result = await Promise.race([
        account.execute(call),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("DEPOSIT_TIMEOUT")), 60000))
      ]);

      if (!result) throw new Error("DEPOSIT_FAILED");

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
