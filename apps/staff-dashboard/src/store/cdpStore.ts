import { create } from 'zustand';
import { apiClient } from '@fnb/utils';

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
  issueVoucher: (id: string, discountPercent: number) => Promise<void>;
}

export const useCdpStore = create<CdpStore>((set) => ({
  customers: [],
  customer360: null,
  loading: false,
  error: null,

  fetchCustomers: async (segment = 'ALL') => {
    set({ loading: true, error: null });
    try {
      const query = segment ? `?segment=${segment}` : '';
      const res: any = await apiClient.get(`/cdp/customers${query}`);
      const list = res.data?.data || res.data || (Array.isArray(res) ? res : []);
      const mapped: Customer[] = list.map((c: any) => ({
        id: c.id,
        name: c.full_name || 'Khách hàng',
        phone: c.phone || '',
        tier: c.membership_tier || 'Thành viên',
        totalSpent: Number(c.total_spent || 0),
        visits: Number(c.total_visits || 0),
        segment: c.rfm_segment || c.segment || 'NEW',
      }));
      set({ customers: mapped, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || 'Không thể tải danh sách khách hàng', loading: false });
    }
  },

  fetchCustomer360: async (id) => {
    set({ loading: true, error: null, customer360: null });
    try {
      const res: any = await apiClient.get(`/cdp/customers/${id}/360`);
      const data = res.data?.data || res.data || res;
      if (!data) throw new Error('Không tìm thấy thông tin khách hàng');

      set({
        customer360: {
          id: data.id,
          name: data.full_name || 'Khách hàng',
          phone: data.phone || '',
          tier: data.membership_tier || 'Thành viên',
          totalSpent: Number(data.total_spent || 0),
          visits: Number(data.total_visits || 0),
          segment: data.rfm_segment || data.segment || 'VIP',
          favoriteItems: data.favorite_items || [],
          dietaryNotes: data.dietary_notes || [],
          orderHistory: data.order_history || [],
        },
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || 'Không thể tải hồ sơ khách hàng', loading: false });
    }
  },

  issueVoucher: async (id, discountPercent) => {
    try {
      await apiClient.post(`/cdp/customers/${id}/vouchers`, {
        discount_percent: discountPercent,
      });
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể tặng voucher lúc này');
    }
  },
}));
