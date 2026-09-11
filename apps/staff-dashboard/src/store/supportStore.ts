import { create } from 'zustand';
import { useAuthStore } from './authStore.ts';

export interface UnmatchedTransaction {
  id: string;
  bankRef: string;
  amount: number;
  date: string;
  content: string;
  status: 'PENDING' | 'PROPOSED' | 'RESOLVED';
  makerId?: string | null;
  proposedCustomerId?: string | null;
  checkerId?: string | null;
}

export interface Candidate {
  id: string;
  name: string;
  phone: string;
  expectedAmount: number;
  confidenceScore: number;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
}

interface SupportStore {
  unmatchedTransactions: UnmatchedTransaction[];
  candidates: Record<string, Candidate[]>; // map from transactionId to candidates
  auditLogs: Record<string, AuditLog[]>;
  loading: boolean;
  error: string | null;
  socketConnected: boolean;

  fetchUnmatched: () => Promise<void>;
  fetchCandidates: (id: string) => Promise<void>;
  fetchAuditLogs: (id: string) => Promise<void>;
  proposeMatch: (id: string, customerId: string) => Promise<void>;
  approveMatch: (id: string) => Promise<void>;
  rejectMatch: (id: string) => Promise<void>;
  simulateSocketEvent: (event: string, data: any) => void;
}

export const useSupportStore = create<SupportStore>((set, get) => ({
  unmatchedTransactions: [],
  candidates: {},
  auditLogs: {},
  loading: false,
  error: null,
  socketConnected: true,

  fetchUnmatched: async () => {
    set({ loading: true, error: null });
    try {
      // Mock data
      setTimeout(() => {
        set({
          unmatchedTransactions: [
            { id: 'TXN-001', bankRef: 'MB-123456', amount: 85000, date: '2026-09-11T10:00:00Z', content: 'Thanh toan cf', status: 'PENDING' },
            { id: 'TXN-002', bankRef: 'VCB-98765', amount: 150000, date: '2026-09-11T10:15:00Z', content: 'CAFE', status: 'PROPOSED', makerId: 'STAFF-1', proposedCustomerId: 'C001' },
          ],
          loading: false
        });
      }, 500);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchCandidates: async (id) => {
    // Mock
    set((state) => ({
      candidates: {
        ...state.candidates,
        [id]: [
          { id: 'C001', name: 'Nguyễn Văn A', phone: '0901234567', expectedAmount: 85000, confidenceScore: 95 },
          { id: 'C002', name: 'Lê Văn C', phone: '0912233445', expectedAmount: 80000, confidenceScore: 60 }
        ]
      }
    }));
  },

  fetchAuditLogs: async (id) => {
    // Mock
    set((state) => ({
      auditLogs: {
        ...state.auditLogs,
        [id]: [
          { id: 'AL-1', action: 'TRANSACTION_DETECTED', actor: 'System', timestamp: '2026-09-11T10:00:00Z' },
        ]
      }
    }));
  },

  proposeMatch: async (id, customerId) => {
    set({ loading: true, error: null });
    try {
      const currentUser = useAuthStore.getState().currentUser;
      if (!currentUser) throw new Error("Chưa đăng nhập");

      // Mock
      setTimeout(() => {
        set((state) => ({
          unmatchedTransactions: state.unmatchedTransactions.map(tx => 
            tx.id === id ? { ...tx, status: 'PROPOSED', makerId: currentUser.id, proposedCustomerId: customerId } : tx
          ),
          auditLogs: {
            ...state.auditLogs,
            [id]: [
              ...(state.auditLogs[id] || []),
              { id: Date.now().toString(), action: 'PROPOSED', actor: currentUser.name, timestamp: new Date().toISOString() }
            ]
          },
          loading: false
        }));
      }, 500);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  approveMatch: async (id) => {
    set({ loading: true, error: null });
    try {
      const currentUser = useAuthStore.getState().currentUser;
      const tx = get().unmatchedTransactions.find(t => t.id === id);
      
      if (!currentUser) throw new Error("Chưa đăng nhập");
      if (tx?.makerId === currentUser.id) {
        throw new Error("ERR_6002_SELF_APPROVAL: Bạn không thể duyệt đề xuất của chính mình!");
      }

      // Mock success
      setTimeout(() => {
        set((state) => ({
          unmatchedTransactions: state.unmatchedTransactions.filter(t => t.id !== id),
          loading: false
        }));
      }, 500);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  rejectMatch: async (id) => {
    set({ loading: true, error: null });
    try {
      // Return to PENDING
      setTimeout(() => {
        set((state) => ({
          unmatchedTransactions: state.unmatchedTransactions.map(tx => 
            tx.id === id ? { ...tx, status: 'PENDING', makerId: null, proposedCustomerId: null } : tx
          ),
          loading: false
        }));
      }, 500);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  simulateSocketEvent: (event, data) => {
    if (event === 'unmatched_transaction_created') {
      set((state) => ({
        unmatchedTransactions: [data, ...state.unmatchedTransactions]
      }));
    }
  }
}));
