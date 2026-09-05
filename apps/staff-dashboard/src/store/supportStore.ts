import { create } from 'zustand';
import { useAuthStore } from './authStore';

export type TxStatus = 'UNMATCHED' | 'PENDING_APPROVAL' | 'RESOLVED';

export interface UnmatchedTransaction {
  id: string;
  amount: number;
  content: string;
  status: TxStatus;
  makerId: string | null;
  proposedCustomerId: string | null;
}

interface SupportStore {
  transactions: UnmatchedTransaction[];
  fetchTransactions: () => Promise<void>;
  propose: (txId: string, customerId: string, makerId: string) => Promise<void>;
  approve: (txId: string, checkerId: string) => Promise<void>;
}

export const useSupportStore = create<SupportStore>((set, get) => ({
  transactions: [],
  
  fetchTransactions: async () => {
    try {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/support/unmatched`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({ transactions: data });
      }
    } catch (e) {
      console.error('Failed to fetch transactions', e);
    }
  },

  propose: async (txId, customerId, makerId) => {
    // Optimistic update
    set(state => ({
      transactions: state.transactions.map(tx => 
        tx.id === txId 
          ? { ...tx, status: 'PENDING_APPROVAL', proposedCustomerId: customerId, makerId } 
          : tx
      )
    }));

    try {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/support/unmatched/${txId}/propose`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ customerId })
      });
      if (!res.ok) throw new Error('API Failed');
    } catch (e) {
      // Revert on failure (simple reload for now)
      get().fetchTransactions();
    }
  },

  approve: async (txId, checkerId) => {
    const tx = get().transactions.find(t => t.id === txId);
    if (!tx) return;
    
    if (tx.makerId === checkerId) {
      throw new Error('ERR_6002_SELF_APPROVAL');
    }

    // Optimistic update
    set((state) => ({
      transactions: state.transactions.map(t => 
        t.id === txId ? { ...t, status: 'RESOLVED' } : t
      )
    }));

    try {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/support/unmatched/${txId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('API Failed');
    } catch (e) {
      get().fetchTransactions();
    }
  }
}));
