import { create } from 'zustand';

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
      setTimeout(() => {
        set({
          tickets: [
            { id: 'TKT-001', customerId: 'C001', customerName: 'Nguyễn Văn A', subject: 'Khách phàn nàn thức ăn có dị vật', status: 'OPEN', isUrgent: true, createdAt: '2026-09-11T10:05:00Z' },
            { id: 'TKT-002', customerId: 'C002', customerName: 'Trần Thị B', subject: 'Không nhận được mã khuyến mãi', status: 'IN_PROGRESS', isUrgent: false, createdAt: '2026-09-11T09:30:00Z' },
          ],
          loading: false
        });
      }, 500);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  resolveTicket: async (id, _resolutionNote) => {
    set({ loading: true, error: null });
    try {
      setTimeout(() => {
        set((state) => ({
          tickets: state.tickets.filter(t => t.id !== id), // or update status to RESOLVED
          loading: false
        }));
      }, 500);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));
