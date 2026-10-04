import { create } from 'zustand';

export interface CoffeePass {
  id: string;
  name: string;
  totalLimit: number;
  remaining: number;
}

export interface CoffeePassPlan {
  id: string;
  name: string;
  price: number;
  valid_days: number;
  total_redemptions: number;
}

interface CoffeePassStore {
  activePasses: CoffeePass[];
  plans: CoffeePassPlan[];
  buyPass: (pass: CoffeePass) => void;
  useTicket: (passId: string) => boolean;
  fetchPlans: () => Promise<void>;
  subscribePlan: (planId: string, planName: string, totalLimit: number) => Promise<{ success: boolean; error?: string }>;
}

export const useCoffeePassStore = create<CoffeePassStore>((set, get) => ({
  activePasses: [],
  plans: [],
  
  buyPass: (pass) => set((state) => ({
    activePasses: [...state.activePasses, { ...pass, id: pass.id || crypto.randomUUID() }]
  })),

  useTicket: (passId) => {
    const state = get();
    const pass = state.activePasses.find(p => p.id === passId);
    
    if (!pass || pass.remaining <= 0) {
      return false;
    }

    set({
      activePasses: state.activePasses.map(p => 
        p.id === passId 
          ? { ...p, remaining: p.remaining - 1 }
          : p
      )
    });

    return true;
  },

  fetchPlans: async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      let token = '';
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
        token = match ? decodeURIComponent(match[1]) : (localStorage.getItem('access_token') || '');
      }
      if (!token) return;

      const res = await fetch(`${baseUrl}/coffee-pass/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const resJson = await res.json();
        const payload = resJson?.data ?? resJson;
        const plansList = Array.isArray(payload?.plans)
          ? payload.plans
          : Array.isArray(payload)
            ? payload
            : [];
        set({ plans: plansList });
      }
    } catch (e) {
      console.warn('Lỗi khi tải coffee pass plans:', e);
    }
  },

  subscribePlan: async (planId: string, planName: string, totalLimit: number) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      let token = '';
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
        token = match ? decodeURIComponent(match[1]) : (localStorage.getItem('access_token') || '');
      }
      if (!token) return { success: false, error: 'Chưa đăng nhập' };

      const res = await fetch(`${baseUrl}/coffee-pass/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_id: planId }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resJson?.error?.message || resJson?.message || 'Đăng ký gói thất bại',
        };
      }

      const payload = resJson?.data ?? resJson;
      const subId = payload?.subscription?.id || planId;
      const remaining = payload?.subscription?.remaining_redemptions ?? totalLimit;

      // Add to local state
      get().buyPass({
        id: subId,
        name: planName,
        totalLimit,
        remaining,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi mạng khi đăng ký gói' };
    }
  },
}));
