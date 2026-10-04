import React from 'react';
import { MapPin, Utensils } from 'lucide-react';

interface BranchTableSummaryProps {
  branchName: string;
  tableName?: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
}

export function BranchTableSummary({ branchName, tableName, orderType }: BranchTableSummaryProps) {
  return (
    <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-[#E8DED5] flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#FAF7F3] rounded-full flex items-center justify-center text-[#D67D3E]">
          <MapPin size={20} />
        </div>
        <div>
          <h3 className="font-bold text-[#543310] text-sm">{branchName}</h3>
          <p className="text-xs text-[#6B625B]">
            {orderType === 'DINE_IN' ? (
              <span className="flex items-center gap-1">
                <Utensils size={12} /> Dùng tại bàn {tableName ? `- ${tableName}` : ''}
              </span>
            ) : (
              'Mang đi'
            )}
          </p>
        </div>
      </div>
      <button className="text-xs font-bold text-[#D67D3E] hover:text-[#543310] px-3 py-1 border border-[#E8DED5] rounded-full">
        Thay đổi
      </button>
    </div>
  );
}
