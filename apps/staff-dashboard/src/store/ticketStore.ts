import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface CsatTicket {
  id: string;
  customerName: string;
  rating: number;
  feedback: string;
  status: 'OPEN' | 'RESOLVED';
  compensationVoucher?: string;
  orderId?: string;
}

interface TicketStore {
  tickets: CsatTicket[];
  fetchTickets: () => Promise<void>;
  addTicket: (tk: CsatTicket) => void;
  resolveTicket: (id: string, voucherCode: string) => Promise<void>;
}

export const useTicketStore = create<TicketStore>((set, get) => ({
  tickets: [],

  fetchTickets: async () => {
    try {
      const token = useAuthStore.getState().accessToken;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${baseUrl}/support/tickets`, { headers });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : (json.data || []);
        set({
          tickets: list.map((t: any) => ({
            id: t.id,
            customerName: t.customer_name || (t.order_id ? `Khách bàn (Đơn #${t.order_id.slice(0, 5)})` : 'Khách hàng'),
            rating: t.csat_score || 5,
            feedback: t.complaint_note || '',
            status: t.status || 'OPEN',
            compensationVoucher: t.resolution_note || undefined,
            orderId: t.order_id,
          })),
        });
      }
    } catch (e) {
      console.error('Failed to fetch support tickets', e);
    }
  },

  addTicket: (tk) => set((state) => ({ tickets: [...state.tickets, tk] })),

  resolveTicket: async (id, voucherCode) => {
    // Optimistic update
    set((state) => ({
      tickets: state.tickets.map((tk) =>
        tk.id === id ? { ...tk, status: 'RESOLVED', compensationVoucher: voucherCode } : tk
      ),
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
      const res = await fetch(`${baseUrl}/support/tickets/${id}/resolve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ resolution_note: `Đã gửi voucher: ${voucherCode}` }),
      });
      if (!res.ok) {
        throw new Error('Failed to resolve ticket');
      }
    } catch (e) {
      console.error('API call failed for resolve ticket', e);
      get().fetchTickets();
    }
  },
}));
