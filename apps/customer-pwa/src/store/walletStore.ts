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
  fetchWallet: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  topUpApi: (amount: number) => Promise<{ success: boolean; error?: string }>;
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
  },

  fetchWallet: async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      let token = '';
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
        token = match ? decodeURIComponent(match[1]) : (localStorage.getItem('access_token') || '');
      }
      if (!token) return;

      const res = await fetch(`${baseUrl}/wallet`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const resJson = await res.json();
        const payload = resJson?.data ?? resJson;
        set({
          mainBalance: Number(payload.main_balance || 0),
          promoBalance: Number(payload.promo_balance || 0),
        });
      }
    } catch (e) {
      console.warn('Failed to fetch wallet:', e);
    }
  },

  fetchHistory: async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      let token = '';
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
        token = match ? decodeURIComponent(match[1]) : (localStorage.getItem('access_token') || '');
      }
      if (!token) return;

      const res = await fetch(`${baseUrl}/wallet/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const resJson = await res.json();
        const payload = resJson?.data ?? resJson;
        const list = Array.isArray(payload) ? payload : (payload.data ?? []);
        const mapped: WalletTransaction[] = list.map((t: any) => ({
          id: t.id,
          amount: Number(t.amount || 0),
          type: t.type === 'TOPUP' ? 'TOP_UP' : (t.type === 'PAYMENT' ? 'PAYMENT' : 'REFUND'),
          description: t.description || (t.type === 'TOPUP' ? 'Nạp tiền vào ví' : 'Thanh toán đơn hàng'),
          timestamp: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
        }));
        set({ history: mapped });
      }
    } catch (e) {
      console.warn('Failed to fetch wallet transactions:', e);
    }
  },

  topUpApi: async (amount: number) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      let token = '';
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
        token = match ? decodeURIComponent(match[1]) : (localStorage.getItem('access_token') || '');
      }
      if (!token) return { success: false, error: 'Chưa đăng nhập. Vui lòng đăng nhập để nạp tiền.' };

      const res = await fetch(`${baseUrl}/wallet/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        return { success: false, error: resJson?.error?.message || resJson?.message || 'Nạp tiền thất bại' };
      }

      await get().fetchWallet();
      await get().fetchHistory();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi mạng khi nạp tiền' };
    }
  },
}));
