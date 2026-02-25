import { create } from 'zustand';

interface VaultState {
  connected: boolean;
  address: string | null;
  balances: {
    USDC: bigint;
    ETH: bigint;
    STRK: bigint;
  };
  starknetObj: any | null;
  pendingSwipes: any[];
  setConnected: (status: boolean, addr: string | null, obj?: any) => void;
  updateBalances: (balances: { USDC: bigint; ETH: bigint; STRK: bigint }) => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  connected: false,
  address: null,
  balances: {
    USDC: 0n,
    ETH: 0n,
    STRK: 0n,
  },
  starknetObj: null,
  pendingSwipes: [],
  setConnected: (status, addr, obj = null) => set({ connected: status, address: addr, starknetObj: obj }),
  updateBalances: (balances) => set({ balances }),
}));
