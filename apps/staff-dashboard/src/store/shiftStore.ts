import { create } from 'zustand';

export interface ShiftRecord {
  id: string;
  branchId: string;
  branchName: string;
  staffName: string;
  startTime: string;
  endTime: string | null;
  startingCash: number;
  revenueCash: number;
  revenueTransfer: number;
  reportedCash: number | null; // Tiền nhân viên đếm
  status: 'OPEN' | 'CLOSED';
}

interface ShiftStore {
  shifts: ShiftRecord[];
  loading: boolean;
  error: string | null;
  fetchShifts: (branchId?: string) => Promise<void>;
}

export const useShiftStore = create<ShiftStore>((set) => ({
  shifts: [],
  loading: false,
  error: null,

  fetchShifts: async (branchId) => {
    set({ loading: true, error: null });
    try {
      setTimeout(() => {
        const mockShifts: ShiftRecord[] = [
          {
            id: 'S-001', branchId: 'B-01', branchName: 'CN Quận 1', staffName: 'Nguyễn Văn A', 
            startTime: '2026-09-11T06:00:00Z', endTime: '2026-09-11T14:00:00Z',
            startingCash: 1000000, revenueCash: 2500000, revenueTransfer: 4500000, reportedCash: 3500000, status: 'CLOSED'
          },
          {
            id: 'S-002', branchId: 'B-01', branchName: 'CN Quận 1', staffName: 'Trần Thị B', 
            startTime: '2026-09-11T14:00:00Z', endTime: null,
            startingCash: 3500000, revenueCash: 1200000, revenueTransfer: 2000000, reportedCash: null, status: 'OPEN'
          },
          {
            id: 'S-003', branchId: 'B-02', branchName: 'CN Quận 3', staffName: 'Lê Văn C', 
            startTime: '2026-09-10T06:00:00Z', endTime: '2026-09-10T14:00:00Z',
            startingCash: 1000000, revenueCash: 1800000, revenueTransfer: 3000000, reportedCash: 2750000, status: 'CLOSED'
          } // Lỗi hụt 50k
        ];
        
        const filtered = branchId ? mockShifts.filter(s => s.branchId === branchId) : mockShifts;
        set({ shifts: filtered, loading: false });
      }, 500);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));
