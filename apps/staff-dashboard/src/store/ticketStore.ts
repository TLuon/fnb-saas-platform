import { create } from 'zustand';
import { apiClient } from '@fnb/utils';

export interface SupportTicket {
  id: string;
  customerId: string;
  customerName: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  isUrgent: boolean;
  createdAt: string;
}

interface TicketStore {
  tickets: SupportTicket[];
  loading: boolean;
  error: string | null;
  fetchTickets: () => Promise<void>;
  resolveTicket: (id: string, resolutionNote: string) => Promise<void>;
}

export const useTicketStore = create<TicketStore>((set) => ({
  tickets: [],
  loading: false,
  error: null,

  fetchTickets: async () => {
    set({ loading: true, error: null });
    try {
      const res: any = await apiClient.get('/support/tickets');
      const list = res.data?.data || res.data || (Array.isArray(res) ? res : []);
      const mapped: SupportTicket[] = list.map((t: any) => ({
        id: t.id,
        customerId: t.customer_id || '',
        customerName: t.customers?.full_name || t.customers?.phone || 'Khách hàng',
        subject: t.complaint_note || `Đánh giá CSAT ${t.csat_score || 5} sao (Đơn #${t.order_id?.slice(0, 8)})`,
        status: t.status,
        isUrgent: t.priority === 'URGENT',
        createdAt: t.created_at || new Date().toISOString(),
      }));
      set({ tickets: mapped, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message || 'Không thể tải danh sách ticket', loading: false });
    }
  },

  resolveTicket: async (id, resolutionNote) => {
    set({ loading: true, error: null });
    try {
      await apiClient.post(`/support/tickets/${id}/resolve`, {
        resolution_note: resolutionNote || 'Đã xử lý thỏa đáng qua kênh hỗ trợ',
      });
      set((state) => ({
        tickets: state.tickets.filter((t) => t.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Lỗi khi xử lý ticket';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },
}));
