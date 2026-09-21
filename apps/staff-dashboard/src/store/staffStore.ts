import { create } from 'zustand';
import { authStore } from '@fnb/utils';

export type Role = 'OWNER' | 'STAFF' | 'SUPPORT';

export interface StaffMember {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  phone?: string;
  branch_id?: string;
}

interface StaffStore {
  staff: StaffMember[];
  fetchStaff: (branchId?: string) => Promise<void>;
  createStaff: (s: Partial<StaffMember>) => Promise<any>;
  updateStaff: (id: string, data: Partial<StaffMember>) => Promise<void>;
  deactivateStaff: (id: string) => Promise<void>;
  toggleStaff: (id: string) => Promise<void>;
}

export const useStaffStore = create<StaffStore>((set, get) => ({
  staff: [],
  
  fetchStaff: async (branchId = '22222222-2222-2222-2222-222222222222') => {
    try {
      const token = authStore.getState().accessToken;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${baseUrl}/staff?branch_id=${branchId}`, {
        headers,
      });
      if (res.ok) {
        const rawStaff = await res.json();
        const rawList = Array.isArray(rawStaff)
          ? rawStaff
          : (rawStaff.data ?? []);
        const staff: StaffMember[] = rawList.map((s: any) => ({
          id: s.id,
          name: s.full_name || s.name || 'Nhân viên',
          role: s.role,
          active: s.is_active !== undefined ? s.is_active : (s.active !== undefined ? s.active : true),
          phone: s.phone,
          branch_id: s.branch_id,
        }));
        set({ staff });
      }
    } catch (e) {
      console.error('Failed to fetch staff', e);
    }
  },

  createStaff: async (staffData) => {
    const token = authStore.getState().accessToken;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

    const res = await fetch(`${baseUrl}/staff`, {
      method: 'POST',
      headers,
      body: JSON.stringify(staffData)
    });
    
    if (!res.ok) {
      throw new Error('Create staff failed');
    }
    
    const newStaffRaw = await res.json();
    const finalData = newStaffRaw.data || newStaffRaw;
    
    set(state => ({ staff: [...state.staff, {
      id: finalData.id,
      name: finalData.full_name || finalData.name || 'Nhân viên mới',
      role: finalData.role,
      active: finalData.is_active ?? true,
      phone: finalData.phone,
      branch_id: finalData.branch_id
    }] }));
    
    return finalData; // Can return temporary_password
  },

  updateStaff: async (id, data) => {
    const token = authStore.getState().accessToken;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

    const res = await fetch(`${baseUrl}/staff/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    
    if (!res.ok) throw new Error('Update staff failed');
    
    set(state => ({
      staff: state.staff.map(x => x.id === id ? { ...x, ...data } : x)
    }));
  },

  deactivateStaff: async (id) => {
    const token = authStore.getState().accessToken;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

    const res = await fetch(`${baseUrl}/staff/${id}/deactivate`, {
      method: 'PATCH',
      headers
    });
    
    if (!res.ok) throw new Error('Deactivate staff failed');
    
    set(state => ({
      staff: state.staff.map(x => x.id === id ? { ...x, active: false } : x)
    }));
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
      const token = authStore.getState().accessToken;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const endpoint = newStatus ? `/staff/${id}` : `/staff/${id}/deactivate`;
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers,
        ...(newStatus ? { body: JSON.stringify({ is_active: true }) } : {}),
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
