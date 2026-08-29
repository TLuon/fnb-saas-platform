import { create } from 'zustand';

export type TxStatus = 'UNMATCHED' | 'PENDING_APPROVAL' | 'RESOLVED';

export interface UnmatchedTransaction {
  id: string;
  amount: number;
  content: string;
  status: TxStatus;
  makerId: string | null;
  proposedCustomerId: string | null;
}

interface SupportStore {
  transactions: UnmatchedTransaction[];
  addTransaction: (tx: UnmatchedTransaction) => void;
  propose: (txId: string, customerId: string, makerId: string) => void;
  approve: (txId: string, checkerId: string) => void;
}

export const useSupportStore = create<SupportStore>((set, get) => ({
  transactions: [
    {
      id: 'tx-001',
      amount: 150000,
      content: 'Nguyen Van A chuyen tien ban 5',
      status: 'UNMATCHED',
      makerId: null,
      proposedCustomerId: null
    },
    {
      id: 'tx-002',
      amount: 75000,
      content: 'Tra da',
      status: 'PENDING_APPROVAL',
      makerId: 'support-1',
      proposedCustomerId: 'C001'
    }
  ],
  addTransaction: (tx) => set(state => ({ transactions: [...state.transactions, tx] })),
  propose: (txId, customerId, makerId) => set(state => ({
    transactions: state.transactions.map(tx => 
      tx.id === txId 
        ? { ...tx, status: 'PENDING_APPROVAL', proposedCustomerId: customerId, makerId } 
        : tx
    )
  })),
  approve: (txId, checkerId) => {
    const tx = get().transactions.find(t => t.id === txId);
    if (!tx) return;
    
    if (tx.makerId === checkerId) {
      throw new Error('ERR_6002_SELF_APPROVAL');
    }

    set(state => ({
      transactions: state.transactions.map(t => 
        t.id === txId 
          ? { ...t, status: 'RESOLVED' } 
          : t
      )
    }));
  }
}));
