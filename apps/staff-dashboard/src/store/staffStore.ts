import { create } from 'zustand';
import { useAuthStore } from './authStore';

export type Role = 'OWNER' | 'STAFF' | 'SUPPORT';

export interface StaffMember {
  id: string;
  name: string;
  role: Role;
  active: boolean;
}

interface StaffStore {
  staff: StaffMember[];
  fetchStaff: () => Promise<void>;
  addStaff: (s: StaffMember) => Promise<void>;
  toggleStaff: (id: string) => Promise<void>;
}

export const useStaffStore = create<StaffStore>((set, get) => ({
  staff: [],
  
  fetchStaff: async () => {
    try {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        set({ staff: await res.json() });
      }
    } catch (e) {
      console.error('Failed to fetch staff', e);
    }
  },

  addStaff: async (s) => {
    set(state => ({ staff: [...state.staff, s] }));
  },

  toggleStaff: async (id) => {
    const s = get().staff.find(x => x.id === id);
    if (!s) return;
    const newStatus = !s.active;

    set(state => ({
      staff: state.staff.map(x => 
        x.id === id ? { ...x, active: newStatus } : x
      )
    }));

    try {
      const token = useAuthStore.getState().accessToken;
      // Assuming deactivated uses a specific endpoint based on previous backend findings
      const endpoint = newStatus ? `/staff/${id}/activate` : `/staff/${id}/deactivate`;
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${endpoint}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('API failed');
    } catch (e) {
      set(state => ({
        staff: state.staff.map(x => 
          x.id === id ? { ...x, active: !newStatus } : x
        )
      }));
    }
  }
}));
