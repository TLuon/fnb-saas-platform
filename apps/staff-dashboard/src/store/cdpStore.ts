import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  tier: string;
  totalSpent: number;
  visits: number;
  segment: 'VIP' | 'LOYAL' | 'CHURN_RISK' | 'NEW';
}

export interface Customer360 extends Customer {
  favoriteItems: { name: string; timesOrdered: number }[];
  dietaryNotes: string[];
  orderHistory: { id: string; date: string; amount: number; branch: string }[];
}

interface CdpStore {
  customers: Customer[];
  customer360: Customer360 | null;
  loading: boolean;
  error: string | null;
  fetchCustomers: (segment?: string) => Promise<void>;
  fetchCustomer360: (id: string) => Promise<void>;
  issueVoucher: (id: string, voucherCode: string) => Promise<void>;
}

export const useCdpStore = create<CdpStore>((set) => ({
  customers: [],
  customer360: null,
  loading: false,
  error: null,

  fetchCustomers: async (segment = 'ALL') => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().accessToken;
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${baseUrl}/cdp/customers?segment=${segment}`, { headers }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        set({ customers: data.data || data, loading: false });
      } else {
        // Fallback mock
        const mockCustomers: Customer[] = [
          { id: 'C001', name: 'Nguyễn Văn A', phone: '0901234567', tier: 'Vàng', totalSpent: 5400000, visits: 24, segment: 'VIP' },
          { id: 'C002', name: 'Trần Thị B', phone: '0987654321', tier: 'Bạc', totalSpent: 1200000, visits: 8, segment: 'LOYAL' },
          { id: 'C003', name: 'Lê Văn C', phone: '0912233445', tier: 'Thành viên', totalSpent: 150000, visits: 1, segment: 'NEW' },
          { id: 'C004', name: 'Phạm Thị D', phone: '0933445566', tier: 'Bạch Kim', totalSpent: 12500000, visits: 56, segment: 'CHURN_RISK' },
        ];
        set({ 
          customers: segment === 'ALL' ? mockCustomers : mockCustomers.filter(c => c.segment === segment),
          loading: false 
        });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchCustomer360: async (id) => {
    set({ loading: true, error: null, customer360: null });
    try {
      const token = useAuthStore.getState().accessToken;
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${baseUrl}/cdp/customers/${id}/360`, { headers }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        set({ customer360: data.data || data, loading: false });
      } else {
        // Fallback mock
        set({
          customer360: {
            id,
            name: 'Nguyễn Văn A',
            phone: '0901234567',
            tier: 'Vàng',
            totalSpent: 5400000,
            visits: 24,
            segment: 'VIP',
            favoriteItems: [
              { name: 'Cà phê Sữa đá', timesOrdered: 18 },
              { name: 'Bánh Sừng Bò', timesOrdered: 5 },
            ],
            dietaryNotes: ['Dị ứng đậu phộng', 'Ít đá'],
            orderHistory: [
              { id: 'ORD-001', date: '2026-09-10T08:30:00Z', amount: 85000, branch: 'Chi nhánh Quận 1' },
              { id: 'ORD-002', date: '2026-09-08T09:15:00Z', amount: 120000, branch: 'Chi nhánh Quận 1' },
            ]
          },
          loading: false
        });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  issueVoucher: async (id, voucherCode) => {
    const token = useAuthStore.getState().accessToken;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
    const res = await fetch(`${baseUrl}/cdp/customers/${id}/vouchers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code: voucherCode })
    }).catch(() => null);

    if (res && !res.ok) {
      throw new Error('Không thể tặng voucher lúc này');
    }
    // Simulate success if mock
  }
}));
