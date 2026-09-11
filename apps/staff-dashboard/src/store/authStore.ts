import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  user: any | null;
  currentUser: any | null;
  setToken: (token: string) => void;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  currentUser: null,
  setToken: (token) => set({ accessToken: token }),
  login: async (email) => {
    // Mock login based on email
    let role = 'STAFF';
    if (email.includes('owner')) role = 'OWNER';
    if (email.includes('support')) role = 'SUPPORT';
    
    set({ 
      accessToken: 'mock-token', 
      currentUser: { id: 'U1', name: 'Nhân viên Demo', email, role, branchId: 'B-01' },
      user: { id: 'U1', name: 'Nhân viên Demo', email, role, branchId: 'B-01' }
    });
  },
  logout: () => set({ accessToken: null, user: null, currentUser: null }),
}));
