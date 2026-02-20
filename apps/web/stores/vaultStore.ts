import { create } from 'zustand';

interface VaultState {
  connected: boolean;
  address: string | null;
  balances: {
    USDC: bigint;
    ETH: bigint;
  };
  pendingSwipes: any[];
  setConnected: (status: boolean, addr: string | null) => void;
  updateBalances: (balances: { USDC: bigint; ETH: bigint }) => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  connected: false,
  address: null,
  balances: {
    USDC: 0n,
    ETH: 0n,
  },
  pendingSwipes: [],
  setConnected: (status, addr) => set({ connected: status, address: addr }),
  updateBalances: (balances) => set({ balances }),
}));
