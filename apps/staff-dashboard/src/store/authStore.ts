import { create } from 'zustand';

interface AuthStore {
  currentUser: { id: string, name: string, role: string };
  switchUser: (id: string, name: string, role: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  currentUser: { id: 'owner-1', name: 'Chủ Quán (Owner)', role: 'OWNER' },
  switchUser: (id, name, role) => set({ currentUser: { id, name, role } })
}));
