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
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${baseUrl}/support/unmatched`, {
        headers
      });
      if (res.ok) {
        const resJson = await res.json();
        const list = Array.isArray(resJson) ? resJson : (resJson.data || []);
        const mapped: UnmatchedTransaction[] = list.map((tx: any) => ({
          id: tx.id,
          amount: tx.amount ?? tx.payment_transactions?.amount ?? 0,
          content: tx.content ?? tx.payment_transactions?.raw_transfer_content ?? '',
          status: tx.status === 'PENDING' ? 'UNMATCHED' : (tx.status === 'PROPOSED' ? 'PENDING_APPROVAL' : (tx.status || 'UNMATCHED')),
          makerId: tx.maker_user_id ?? tx.makerId ?? null,
          proposedCustomerId: tx.suggested_customer_id ?? tx.proposedCustomerId ?? null,
        }));
        set({ transactions: mapped });
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${baseUrl}/support/unmatched/${txId}/propose`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ customer_id: customerId })
      });
      if (!res.ok) throw new Error('API Failed');
    } catch (e) {
      // Revert on failure
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
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${baseUrl}/support/unmatched/${txId}/approve`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) throw new Error('API Failed');
    } catch (e) {
      get().fetchTransactions();
    }
  }
}));
