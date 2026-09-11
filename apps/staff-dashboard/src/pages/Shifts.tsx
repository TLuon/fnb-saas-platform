import { useEffect } from 'react';
import { useShiftStore } from '../store/shiftStore';
import { ShiftHistoryBoard } from '../components/shifts/ShiftHistoryBoard';

export default function Shifts() {
  const { shifts, loading, fetchShifts } = useShiftStore();

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div>
        <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">Quản lý Ca làm việc</h2>
        <p className="text-gray-500 mt-2">Đối soát dòng tiền thực tế và phát hiện chênh lệch thất thoát.</p>
      </div>

      <ShiftHistoryBoard shifts={shifts} />

      {loading && shifts.length === 0 && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm h-[500px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"></div>
        </div>
      )}
    </div>
  );
}
