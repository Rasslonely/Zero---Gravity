import { create } from 'zustand';

interface BchState {
  burnerAddress: string | null;
  burnerBalance: number;
  recentTxs: string[];
  setBurnerAddress: (addr: string) => void;
  updateBalance: (balance: number) => void;
  addTx: (txId: string) => void;
}

export const useBchStore = create<BchState>((set) => ({
  burnerAddress: null,
  burnerBalance: 0,
  recentTxs: [],
  setBurnerAddress: (addr) => set({ burnerAddress: addr }),
  updateBalance: (balance) => set({ burnerBalance: balance }),
  addTx: (txId) => set((state) => ({ recentTxs: [txId, ...state.recentTxs] })),
}));
