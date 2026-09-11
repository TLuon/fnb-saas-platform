import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSupportStore } from './supportStore';
import { useAuthStore } from './authStore';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('useSupportStore', () => {
  beforeEach(() => {
    useSupportStore.setState({ transactions: [] });
    useAuthStore.setState({ accessToken: 'mock-token' });
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  });

  it('fetches transactions from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { id: 'tx1', amount: 50000, content: 'Tra da', status: 'UNMATCHED', makerId: null, proposedCustomerId: null }
      ])
    });

    await useSupportStore.getState().fetchTransactions();
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/support/unmatched'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': 'Bearer mock-token' })
      })
    );
    expect(useSupportStore.getState().transactions).toHaveLength(1);
    expect(useSupportStore.getState().transactions[0].id).toBe('tx1');
  });

  it('Maker can propose a transaction via API', async () => {
    useSupportStore.setState({
      transactions: [{ id: 'tx1', amount: 50000, content: 'Chuyen tien tra dao', status: 'UNMATCHED', makerId: null, proposedCustomerId: null }]
    });
    
    await useSupportStore.getState().propose('tx1', 'customer1', 'maker1');
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/support/unmatched/tx1/propose'),
      expect.objectContaining({ method: 'POST' })
    );

    const tx = useSupportStore.getState().transactions[0];
    expect(tx.status).toBe('PENDING_APPROVAL');
    expect(tx.makerId).toBe('maker1');
    expect(tx.proposedCustomerId).toBe('customer1');
  });

  it('Checker cannot approve their own proposal (optimistic check)', async () => {
    useSupportStore.setState({
      transactions: [{ id: 'tx1', amount: 50000, content: 'Chuyen tien tra dao', status: 'PENDING_APPROVAL', makerId: 'maker1', proposedCustomerId: 'C001' }]
    });
    
    await expect(useSupportStore.getState().approve('tx1', 'maker1')).rejects.toThrow('ERR_6002_SELF_APPROVAL');
    
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('Checker can approve other proposal via API', async () => {
    useSupportStore.setState({
      transactions: [{ id: 'tx1', amount: 50000, content: 'Chuyen tien tra dao', status: 'PENDING_APPROVAL', makerId: 'support-1', proposedCustomerId: 'C001' }]
    });
    
    await useSupportStore.getState().approve('tx1', 'checker1');
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/support/unmatched/tx1/approve'),
      expect.objectContaining({ method: 'POST' })
    );

    const tx = useSupportStore.getState().transactions[0];
    expect(tx.status).toBe('RESOLVED');
  });
});
