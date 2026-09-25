import { create } from 'zustand';
import { apiClient } from '@fnb/utils';

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

export interface RevenueOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  modifiers: unknown[];
}

export interface RevenueOrder {
  id: string;
  orderCode: string;
  branchName: string;
  tableCode: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  subtotal: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: string | null;
  createdAt: string;
  items: RevenueOrderItem[];
}

export interface OccupiedTableOrder {
  id: string;
  order_code: string;
  order_type: string;
  final_amount: number;
  status: string;
  created_at: string;
}

export interface OccupiedTable {
  id: string;
  table_code: string;
  capacity: number;
  status: string;
  floor_id?: string;
  floor_name?: string;
  branch_id?: string;
  branch_name?: string;
  current_order_id?: string | null;
  order?: OccupiedTableOrder | null;
  updated_at?: string;
}

interface AnalyticsStore {
  dashboardData: DashboardData | null;
  revenueOrders: RevenueOrder[];
  occupiedTablesList: OccupiedTable[];
  loading: boolean;
  ordersLoading: boolean;
  tablesLoading: boolean;
  error: string | null;
  ordersError: string | null;
  tablesError: string | null;
  fetchDashboard: (branchId?: string, period?: string) => Promise<void>;
  fetchRevenueOrders: (branchId?: string, period?: string) => Promise<void>;
  fetchOccupiedTables: (branchId?: string, status?: string) => Promise<void>;
  updateTableStatus: (tableId: string, newStatus: string) => Promise<boolean>;
}

// Module-level request counter to prevent race conditions on rapid switching
let latestRequestId = 0;
let latestOrdersRequestId = 0;
let latestTablesRequestId = 0;

const unwrapResponse = (response: any) => response?.data?.data ?? response?.data ?? response;

const firstRelation = (value: any) => Array.isArray(value) ? value[0] : value;

export const mapRevenueOrder = (order: any): RevenueOrder => {
  const customer = firstRelation(order?.customers) ?? {};
  const branch = firstRelation(order?.branches) ?? {};
  const table = firstRelation(order?.tables) ?? null;
  const rawItems = Array.isArray(order?.order_items) ? order.order_items : [];

  return {
    id: String(order?.id ?? ''),
    orderCode: String(order?.order_code ?? order?.id ?? 'Không có mã'),
    branchName: String(branch?.name ?? 'Không rõ chi nhánh'),
    tableCode: table?.table_code ? String(table.table_code) : null,
    customerName: String(customer?.full_name ?? 'Khách vãng lai'),
    customerEmail: customer?.email ? String(customer.email) : null,
    customerPhone: customer?.phone ? String(customer.phone) : null,
    orderType: order?.order_type === 'TAKEAWAY' ? 'TAKEAWAY' : 'DINE_IN',
    subtotal: Number(order?.subtotal ?? 0),
    discountAmount: Number(order?.discount_amount ?? 0),
    finalAmount: Number(order?.final_amount ?? 0),
    paymentMethod: order?.payment_method ? String(order.payment_method) : null,
    createdAt: String(order?.created_at ?? ''),
    items: rawItems.map((item: any) => ({
      id: String(item?.id ?? ''),
      productName: String(item?.product_name ?? 'Món không xác định'),
      quantity: Number(item?.quantity ?? 0),
      unitPrice: Number(item?.unit_price ?? 0),
      modifiers: Array.isArray(item?.modifiers) ? item.modifiers : [],
    })),
  };
};

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  dashboardData: null,
  revenueOrders: [],
  occupiedTablesList: [],
  loading: false,
  ordersLoading: false,
  tablesLoading: false,
  error: null,
  ordersError: null,
  tablesError: null,

  fetchDashboard: async (branchId = 'all', period = 'today') => {
    const currentRequestId = ++latestRequestId;
    set({ loading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (branchId && branchId !== 'all') {
        params.append('branch_id', branchId);
      }
      if (period) {
        params.append('period', period);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res: any = await apiClient.get(`/reports/dashboard${queryString}`);

      // If a newer request was dispatched while this was in flight, ignore this response
      if (currentRequestId !== latestRequestId) {
        return;
      }

      const data = res.data?.data || res.data || res || {};

      const revenue = Number(data.revenue ?? data.revenue_today ?? 0);
      const ordersCount = Number(data.orders_count ?? 0);
      const occupiedTables = Number(data.occupied_tables ?? 0);
      const averageOrderValue = Number(
        data.average_order_value ?? (ordersCount > 0 ? Math.round(revenue / ordersCount) : 0),
      );
      const revenueTrend = Number(data.revenue_trend ?? 0);
      const ordersTrend = Number(data.orders_trend ?? 0);

      const chartData = Array.isArray(data.chart_data) ? data.chart_data : [];

      const topProducts = (data.top_products || []).map((tp: any, idx: number) => ({
        id: tp.id || tp.product_id || String(idx + 1),
        name: tp.name || tp.product_name || `Món #${idx + 1}`,
        quantity: Number(tp.quantity || tp.total_quantity || 0),
        revenue: Number(tp.revenue ?? 0),
      }));

      const paymentBreakdown = Array.isArray(data.payment_breakdown) ? data.payment_breakdown : [];

      set({
        dashboardData: {
          revenue,
          ordersCount,
          occupiedTables,
          averageOrderValue,
          revenueTrend,
          ordersTrend,
          chartData,
          topProducts,
          paymentBreakdown,
        },
        loading: false,
      });
    } catch (err: any) {
      if (currentRequestId !== latestRequestId) {
        return;
      }
      set({
        error: err.response?.data?.message || err.message || 'Không thể tải báo cáo doanh thu',
        loading: false,
      });
    }
  },

  fetchRevenueOrders: async (branchId = 'all', period = 'today') => {
    const currentRequestId = ++latestOrdersRequestId;
    set({ ordersLoading: true, ordersError: null });

    try {
      const params = new URLSearchParams();
      if (branchId && branchId !== 'all') params.append('branch_id', branchId);
      if (period) params.append('period', period);

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get(`/reports/orders${query}`);
      if (currentRequestId !== latestOrdersRequestId) return;

      const payload = unwrapResponse(response);
      if (!Array.isArray(payload)) {
        throw new Error('Dữ liệu giao dịch không đúng định dạng');
      }

      set({
        revenueOrders: payload.map(mapRevenueOrder).filter((order) => order.id),
        ordersLoading: false,
      });
    } catch (err: any) {
      if (currentRequestId !== latestOrdersRequestId) return;
      set({
        revenueOrders: [],
        ordersLoading: false,
        ordersError: err?.message || 'Không thể tải danh sách giao dịch',
      });
    }
  },

  fetchOccupiedTables: async (branchId = 'all', status = 'OCCUPIED') => {
    const currentRequestId = ++latestTablesRequestId;
    set({ tablesLoading: true, tablesError: null });

    try {
      const params = new URLSearchParams();
      if (branchId && branchId !== 'all') params.append('branch_id', branchId);
      if (status && status !== 'all') params.append('status', status);

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get(`/reports/tables${query}`);
      if (currentRequestId !== latestTablesRequestId) return;

      const payload = unwrapResponse(response);
      const list = Array.isArray(payload) ? payload : [];
      set({
        occupiedTablesList: list,
        tablesLoading: false,
      });
    } catch (err: any) {
      if (currentRequestId !== latestTablesRequestId) return;
      set({
        occupiedTablesList: [],
        tablesLoading: false,
        tablesError: err?.response?.data?.message || err?.message || 'Không thể tải danh sách bàn',
      });
    }
  },

  updateTableStatus: async (tableId: string, newStatus: string) => {
    try {
      await apiClient.patch(`/tables/${tableId}/status`, { status: newStatus });
      set((state) => {
        const updatedList = state.occupiedTablesList.map((t) =>
          t.id === tableId
            ? { ...t, status: newStatus, current_order_id: newStatus === 'AVAILABLE' ? null : t.current_order_id }
            : t,
        );
        const occupiedCount = updatedList.filter((t) => t.status === 'OCCUPIED').length;
        return {
          occupiedTablesList: updatedList,
          dashboardData: state.dashboardData
            ? { ...state.dashboardData, occupiedTables: occupiedCount }
            : null,
        };
      });
      return true;
    } catch (err: any) {
      console.error('Failed to update table status:', err);
      throw err;
    }
  },
}));
