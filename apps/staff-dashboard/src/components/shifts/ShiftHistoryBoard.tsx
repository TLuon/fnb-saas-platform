import { useState } from 'react';
import type { ShiftRecord } from '../../store/shiftStore';
import { ShiftReconciliationTable } from './ShiftReconciliationTable';

interface ShiftHistoryBoardProps {
  shifts: ShiftRecord[];
}

export function ShiftHistoryBoard({ shifts }: ShiftHistoryBoardProps) {
  const [filterBranch, setFilterBranch] = useState('ALL');

  const filteredShifts = filterBranch === 'ALL' ? shifts : shifts.filter(s => s.branchId === filterBranch);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#543310] mb-1">Bộ lọc Ca làm việc</h3>
          <p className="text-sm text-gray-500">Tra cứu lịch sử chốt ca của nhân viên tại các chi nhánh</p>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 tracking-wide">Chi nhánh</label>
            <select 
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-secondary)] outline-none font-medium text-gray-700 min-w-[200px]"
            >
              <option value="ALL">Tất cả chi nhánh</option>
              <option value="B-01">CN Quận 1</option>
              <option value="B-02">CN Quận 3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 tracking-wide">Thời gian</label>
            <input 
              type="date" 
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-secondary)] outline-none font-medium text-gray-700"
            />
          </div>
        </div>
      </div>

      <ShiftReconciliationTable shifts={filteredShifts} />
    </div>
  );
}
