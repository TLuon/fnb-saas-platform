import { useEffect, useState } from 'react';
import { apiClient } from '@fnb/utils';

export interface Branch {
  id: string;
  name: string;
  address?: string;
}

interface BranchDateFilterProps {
  branchId: string;
  setBranchId: (id: string) => void;
  period: string;
  setPeriod: (period: string) => void;
}

const DEFAULT_BRANCHES: Branch[] = [
  { id: '22222222-2222-2222-2222-222222222222', name: 'Chi nhánh Quận 1' },
  { id: '22222222-2222-2222-2222-333333333333', name: 'Chi nhánh Quận 3' },
];

export function BranchDateFilter({ branchId, setBranchId, period, setPeriod }: BranchDateFilterProps) {
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/branches')
      .then((res: any) => {
        if (!isMounted) return;
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setBranches(list);
        }
      })
      .catch((err) => {
        console.error('Failed to load branches from API:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
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
