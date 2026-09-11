interface BranchDateFilterProps {
  branchId: string;
  setBranchId: (id: string) => void;
  period: string;
  setPeriod: (period: string) => void;
}

export function BranchDateFilter({ branchId, setBranchId, period, setPeriod }: BranchDateFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex-1 w-full flex items-center gap-4">
        <label className="font-semibold text-gray-700 whitespace-nowrap">Chi nhánh:</label>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="flex-1 max-w-xs border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:border-transparent outline-none bg-white"
        >
          <option value="all">Tất cả chi nhánh</option>
          <option value="1">Chi nhánh Quận 1</option>
          <option value="2">Chi nhánh Quận 3</option>
        </select>
      </div>

      <div className="flex-1 w-full flex items-center gap-4 sm:justify-end">
        <label className="font-semibold text-gray-700 whitespace-nowrap">Thời gian:</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="w-full sm:w-auto border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:border-transparent outline-none bg-white"
        >
          <option value="today">Hôm nay</option>
          <option value="yesterday">Hôm qua</option>
          <option value="this_week">Tuần này</option>
          <option value="this_month">Tháng này</option>
        </select>
      </div>
    </div>
  );
}
