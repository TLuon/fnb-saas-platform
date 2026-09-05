import { create } from 'zustand';

export interface WalletTransaction {
  id: string;
  amount: number;
  type: 'TOP_UP' | 'PAYMENT' | 'REFUND';
  description: string;
  timestamp: number;
}

interface WalletStore {
  mainBalance: number;
  promoBalance: number;
  history: WalletTransaction[];
  getTotalBalance: () => number;
  topUp: (amount: number, description: string) => void;
  spend: (amount: number, description: string) => boolean;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  mainBalance: 0,
  promoBalance: 0,
  history: [],
  
  getTotalBalance: () => {
    const { mainBalance, promoBalance } = get();
    return mainBalance + promoBalance;
  },

  topUp: (amount, description) => set((state) => ({
    mainBalance: state.mainBalance + amount,
    history: [{
      id: crypto.randomUUID(),
      amount,
      type: 'TOP_UP',
      description,
      timestamp: Date.now()
    }, ...state.history]
  })),

  spend: (amount, description) => {
    const state = get();
    if (state.getTotalBalance() < amount) {
      return false;
    }

    let remainingToDeduct = amount;
    let newPromo = state.promoBalance;
    let newMain = state.mainBalance;

    if (newPromo >= remainingToDeduct) {
      newPromo -= remainingToDeduct;
    } else {
      remainingToDeduct -= newPromo;
      newPromo = 0;
      newMain -= remainingToDeduct;
    }

    set({
      mainBalance: newMain,
      promoBalance: newPromo,
      history: [{
        id: crypto.randomUUID(),
        amount: -amount,
        type: 'PAYMENT',
        description,
        timestamp: Date.now()
      }, ...state.history]
    });

    return true;
  }
}));
