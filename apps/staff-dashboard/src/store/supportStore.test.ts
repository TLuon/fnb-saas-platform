import { describe, it, expect, beforeEach } from 'vitest';
import { useSupportStore } from './supportStore';

describe('useSupportStore', () => {
  beforeEach(() => {
    useSupportStore.setState({ transactions: [] });
  });

  it('Maker can propose a transaction', () => {
    const store = useSupportStore.getState();
    store.addTransaction({ id: 'tx1', amount: 50000, content: 'Chuyen tien tra dao', status: 'UNMATCHED', makerId: null, proposedCustomerId: null });
    
    useSupportStore.getState().propose('tx1', 'C001', 'support-1');
    const tx = useSupportStore.getState().transactions[0];
    
    expect(tx.status).toBe('PENDING_APPROVAL');
    expect(tx.makerId).toBe('support-1');
    expect(tx.proposedCustomerId).toBe('C001');
  });

  it('Checker cannot approve their own proposal (ERR_6002_SELF_APPROVAL)', () => {
    const store = useSupportStore.getState();
    store.addTransaction({ id: 'tx1', amount: 50000, content: 'Chuyen tien tra dao', status: 'PENDING_APPROVAL', makerId: 'support-1', proposedCustomerId: 'C001' });
    
    expect(() => {
      useSupportStore.getState().approve('tx1', 'support-1');
    }).toThrowError('ERR_6002_SELF_APPROVAL');
  });

  it('Checker can approve other proposal', () => {
    const store = useSupportStore.getState();
    store.addTransaction({ id: 'tx1', amount: 50000, content: 'Chuyen tien tra dao', status: 'PENDING_APPROVAL', makerId: 'support-1', proposedCustomerId: 'C001' });
    
    useSupportStore.getState().approve('tx1', 'support-2');
    const tx = useSupportStore.getState().transactions[0];
    
    expect(tx.status).toBe('RESOLVED');
  });
});
