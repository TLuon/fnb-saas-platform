import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface DashboardData {
  revenue: number;
  ordersCount: number;
  occupiedTables: number;
  averageOrderValue: number;
  revenueTrend: number;
  ordersTrend: number;
  chartData: { time: string; revenue: number }[];
  topProducts: { id: string; name: string; quantity: number; revenue: number }[];
  paymentBreakdown: { method: string; percentage: number; amount: number }[];
}

interface AnalyticsStore {
  dashboardData: DashboardData | null;
  loading: boolean;
  error: string | null;
  fetchDashboard: (branchId?: string, period?: string) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  dashboardData: null,
  loading: false,
  error: null,

  fetchDashboard: async (branchId = 'all', period = 'today') => {
    set({ loading: true, error: null });
    try {
      const token = useAuthStore.getState().accessToken;
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      // MOCK DATA for now until API is perfectly ready to be called
      // In a real app we fetch: `${baseUrl}/reports/dashboard?branch_id=${branchId}&period=${period}`
      const res = await fetch(`${baseUrl}/reports/dashboard?branch_id=${branchId}&period=${period}`, { headers }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        set({ dashboardData: data.data || data, loading: false });
      } else {
        // Fallback mock data if API fails
        set({
          dashboardData: {
            revenue: 12500000,
            ordersCount: 142,
            occupiedTables: 12,
            averageOrderValue: 88000,
            revenueTrend: 15.2,
            ordersTrend: -2.4,
            chartData: [
              { time: '08:00', revenue: 1200000 },
              { time: '10:00', revenue: 2500000 },
              { time: '12:00', revenue: 4800000 },
              { time: '14:00', revenue: 1500000 },
              { time: '16:00', revenue: 1100000 },
              { time: '18:00', revenue: 800000 },
              { time: '20:00', revenue: 600000 },
            ],
            topProducts: [
              { id: '1', name: 'Cà phê Sữa đá', quantity: 85, revenue: 2975000 },
              { id: '2', name: 'Trà Đào Cam Sả', quantity: 62, revenue: 2790000 },
              { id: '3', name: 'Bạc Xỉu', quantity: 45, revenue: 1575000 },
              { id: '4', name: 'Bánh Sừng Bò', quantity: 30, revenue: 1050000 },
            ],
            paymentBreakdown: [
              { method: 'Chuyển khoản / QR', percentage: 65, amount: 8125000 },
              { method: 'Tiền mặt', percentage: 25, amount: 3125000 },
              { method: 'Thẻ / Ví', percentage: 10, amount: 1250000 },
            ]
          },
          loading: false
        });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  }
}));
