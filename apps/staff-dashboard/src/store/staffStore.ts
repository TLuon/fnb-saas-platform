import { create } from 'zustand';

export type Role = 'OWNER' | 'STAFF' | 'SUPPORT';

export interface StaffMember {
  id: string;
  name: string;
  role: Role;
  active: boolean;
}

interface StaffStore {
  staff: StaffMember[];
  addStaff: (s: StaffMember) => void;
  toggleStaff: (id: string) => void;
}

export const useStaffStore = create<StaffStore>((set) => ({
  staff: [
    { id: '1', name: 'Nguyễn Văn Chủ', role: 'OWNER', active: true },
    { id: '2', name: 'Trần Nhân Viên', role: 'STAFF', active: true },
    { id: '3', name: 'Lê Hỗ Trợ', role: 'SUPPORT', active: true },
  ],
  addStaff: (s) => set(state => ({ staff: [...state.staff, s] })),
  toggleStaff: (id) => set(state => ({
    staff: state.staff.map(s => 
      s.id === id ? { ...s, active: !s.active } : s
    )
  }))
}));
