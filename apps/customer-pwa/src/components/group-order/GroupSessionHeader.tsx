import React from 'react';
import { Users, AlertCircle } from 'lucide-react';

interface GroupSessionHeaderProps {
  tableName: string;
  memberCount: number;
  status: 'ACTIVE' | 'LOCKED' | 'EXPIRED';
}

export function GroupSessionHeader({ tableName, memberCount, status }: GroupSessionHeaderProps) {
  return (
    <div className="bg-[#FFFFFF] p-4 flex items-center justify-between border-b border-[#E8DED5]">
      <div>
        <h1 className="text-xl font-bold font-serif text-[#543310]">Bàn {tableName}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-1 text-sm text-[#6B625B]">
            <Users size={16} /> {memberCount} thành viên
          </span>
          {status === 'LOCKED' && (
            <span className="flex items-center gap-1 text-xs font-bold text-[#D67D3E] bg-[#FED8B1]/30 px-2 py-0.5 rounded-full">
              Đã chốt đơn
            </span>
          )}
          {status === 'EXPIRED' && (
            <span className="flex items-center gap-1 text-xs font-bold text-[#B42318] bg-[#FEE4E2] px-2 py-0.5 rounded-full">
              <AlertCircle size={12} /> Hết hạn
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
