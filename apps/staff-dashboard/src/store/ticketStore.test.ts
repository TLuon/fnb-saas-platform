import { describe, it, expect, beforeEach } from 'vitest';
import { useTicketStore } from './ticketStore';

describe('useTicketStore', () => {
  beforeEach(() => {
    useTicketStore.setState({ tickets: [] });
  });

  it('Can resolve a ticket and send voucher', () => {
    const store = useTicketStore.getState();
    store.addTicket({ id: 'tk1', customerName: 'Khách A', rating: 2, feedback: 'Thái độ tệ', status: 'OPEN' });
    
    useTicketStore.getState().resolveTicket('tk1', 'VOUCHER-APOLOGY-123');
    const tk = useTicketStore.getState().tickets[0];
    
    expect(tk.status).toBe('RESOLVED');
    expect(tk.compensationVoucher).toBe('VOUCHER-APOLOGY-123');
  });
});
