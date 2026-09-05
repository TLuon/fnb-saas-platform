import { create } from 'zustand';

interface AuthStore {
  currentUser: { id: string, name: string, role: string };
  accessToken: string;
  switchUser: (id: string, name: string, role: string) => void;
  setAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  currentUser: { id: 'owner-1', name: 'Chủ Quán (Owner)', role: 'OWNER' },
  accessToken: 'mock-token',
  switchUser: (id, name, role) => set({ currentUser: { id, name, role } }),
  setAccessToken: (token) => set({ accessToken: token })
}));
