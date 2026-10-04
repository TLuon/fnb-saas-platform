import { create } from 'zustand';
import { apiClient } from '@fnb/utils';

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
  resetPassword: (id: string, customPassword?: string) => Promise<{ new_password?: string }>;
}

export const useStaffStore = create<StaffStore>((set, get) => ({
  staff: [],
  
  fetchStaff: async (branchId = '22222222-2222-2222-2222-222222222222') => {
    try {
      const res: any = await apiClient.get(`/staff?branch_id=${branchId}`);
      const rawList = Array.isArray(res) 
        ? res 
        : (res?.data?.data || res?.data || []);
      const staff: StaffMember[] = rawList.map((s: any) => ({
        id: s.id,
        name: s.full_name || s.name || 'Nhân viên',
        role: s.role,
        active: s.is_active !== undefined ? s.is_active : (s.active !== undefined ? s.active : true),
        phone: s.phone,
        branch_id: s.branch_id,
      }));
      set({ staff });
    } catch (e) {
      console.error('Failed to fetch staff', e);
    }
  },

  createStaff: async (staffData: any) => {
    const payload = {
      ...staffData,
      full_name: staffData.name,
      email: staffData.email,
    };
    const res: any = await apiClient.post(`/staff`, payload);
    
    // apiClient interceptor already unwraps data.data, so res might be the actual object
    const finalData = res?.data?.data || res?.data || res;
    
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
    await apiClient.patch(`/staff/${id}`, data);
    
    set(state => ({
      staff: state.staff.map(x => x.id === id ? { ...x, ...data } : x)
    }));
  },

  deactivateStaff: async (id) => {
    await apiClient.patch(`/staff/${id}/deactivate`);
    
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
      const endpoint = newStatus ? `/staff/${id}` : `/staff/${id}/deactivate`;
      if (newStatus) {
        await apiClient.patch(endpoint, { is_active: true });
      } else {
        await apiClient.patch(endpoint);
      }
      await get().fetchStaff();
    } catch (e) {
      set(state => ({
        staff: state.staff.map(x => 
          x.id === id ? { ...x, active: !newStatus } : x
        )
      }));
    }
  },

  resetPassword: async (id: string, customPassword?: string) => {
    const res: any = await apiClient.post(`/staff/${id}/reset-password`, {
      password: customPassword || undefined,
    });
    const finalData = res?.data?.data || res?.data || res;
    return finalData;
  },
}));
