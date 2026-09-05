import { create } from 'zustand';

export interface CsatTicket {
  id: string;
  customerName: string;
  rating: number;
  feedback: string;
  status: 'OPEN' | 'RESOLVED';
  compensationVoucher?: string;
}

interface TicketStore {
  tickets: CsatTicket[];
  addTicket: (tk: CsatTicket) => void;
  resolveTicket: (id: string, voucherCode: string) => void;
}

export const useTicketStore = create<TicketStore>((set) => ({
  tickets: [
    {
      id: 'TK-1001',
      customerName: 'Khách Bàn 5',
      rating: 2,
      feedback: 'Lên món quá chậm, đợi 30 phút chưa có cà phê.',
      status: 'OPEN'
    },
    {
      id: 'TK-1002',
      customerName: 'Khách Bàn 12',
      rating: 1,
      feedback: 'Thái độ nhân viên không tốt, ly bẩn.',
      status: 'OPEN'
    }
  ],
  addTicket: (tk) => set(state => ({ tickets: [...state.tickets, tk] })),
  resolveTicket: (id, voucherCode) => set(state => ({
    tickets: state.tickets.map(tk => 
      tk.id === id 
        ? { ...tk, status: 'RESOLVED', compensationVoucher: voucherCode } 
        : tk
    )
  }))
}));
