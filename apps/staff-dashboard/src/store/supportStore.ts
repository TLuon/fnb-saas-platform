import { create } from 'zustand';
import { apiClient, authStore } from '@fnb/utils';

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
      const res: any = await apiClient.get('/support/unmatched');
      const list = res.data?.data || res.data || (Array.isArray(res) ? res : []);
      const mapped: UnmatchedTransaction[] = list.map((t: any) => ({
        id: t.id,
        bankRef: t.payment_transactions?.id || t.id,
        amount: Number(t.payment_transactions?.amount || 0),
        date: t.created_at || t.payment_transactions?.created_at || new Date().toISOString(),
        content: t.payment_transactions?.raw_transfer_content || '',
        status: t.status === 'APPROVED' ? 'RESOLVED' : t.status,
        makerId: t.maker_user_id,
        proposedCustomerId: t.suggested_customer_id,
        checkerId: t.checker_user_id,
      }));
      set({ unmatchedTransactions: mapped, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message || 'Không thể tải danh sách giao dịch lỗi', loading: false });
    }
  },

  fetchCandidates: async (id) => {
    try {
      const res: any = await apiClient.get(`/support/unmatched/${id}/suggest`);
      const suggestions = res.suggestions || res.data?.suggestions || res.data || [];
      const mapped: Candidate[] = (Array.isArray(suggestions) ? suggestions : []).map((s: any) => ({
        id: s.customer_id || s.id,
        name: s.customer_name || s.name || 'Khách hàng',
        phone: s.phone || '',
        expectedAmount: s.expected_amount || 0,
        confidenceScore: s.score || s.confidenceScore || 80,
      }));

      set((state) => ({
        candidates: {
          ...state.candidates,
          [id]: mapped,
        },
      }));
    } catch (error: any) {
      console.warn('Lỗi tải gợi ý khách hàng:', error);
    }
  },

  fetchAuditLogs: async (id) => {
    set((state) => ({
      auditLogs: {
        ...state.auditLogs,
        [id]: state.auditLogs[id] || [
          { id: `al_${Date.now()}`, action: 'TRANSACTION_DETECTED', actor: 'System', timestamp: new Date().toISOString() },
        ],
      },
    }));
  },

  proposeMatch: async (id, customerId) => {
    set({ loading: true, error: null });
    try {
      const currentUser = authStore.getState().profile;
      if (!currentUser) throw new Error("Chưa đăng nhập");

      await apiClient.post(`/support/unmatched/${id}/propose`, { customer_id: customerId });

      set((state) => ({
        unmatchedTransactions: state.unmatchedTransactions.map(tx =>
          tx.id === id ? { ...tx, status: 'PROPOSED', makerId: currentUser.id, proposedCustomerId: customerId } : tx
        ),
        auditLogs: {
          ...state.auditLogs,
          [id]: [
            ...(state.auditLogs[id] || []),
            { id: Date.now().toString(), action: 'PROPOSED', actor: currentUser.full_name || currentUser.email || 'Staff', timestamp: new Date().toISOString() }
          ]
        },
        loading: false
      }));
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Lỗi khi đề xuất khớp khách';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  approveMatch: async (id) => {
    set({ loading: true, error: null });
    try {
      const currentUser = authStore.getState().profile;
      const tx = get().unmatchedTransactions.find(t => t.id === id);

      if (!currentUser) throw new Error("Chưa đăng nhập");
      if (tx?.makerId === currentUser.id) {
        throw new Error("ERR_6002_SELF_APPROVAL: Bạn không thể duyệt đề xuất của chính mình!");
      }

      await apiClient.post(`/support/unmatched/${id}/approve`);

      set((state) => ({
        unmatchedTransactions: state.unmatchedTransactions.filter(t => t.id !== id),
        loading: false
      }));
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Lỗi khi duyệt đề xuất';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  rejectMatch: async (id) => {
    set({ loading: true, error: null });
    try {
      set((state) => ({
        unmatchedTransactions: state.unmatchedTransactions.map(tx =>
          tx.id === id ? { ...tx, status: 'PENDING', makerId: null, proposedCustomerId: null } : tx
        ),
        loading: false
      }));
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
