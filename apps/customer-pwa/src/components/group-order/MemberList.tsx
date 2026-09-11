import React from 'react';
import { User } from 'lucide-react';

interface MemberListProps {
  members: string[];
}

export function MemberList({ members }: MemberListProps) {
  if (!members || members.length === 0) return null;

  return (
    <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-[#E8DED5]">
      <h3 className="text-sm font-bold text-[#543310] mb-3">Thành viên ({members.length})</h3>
      <div className="flex flex-wrap gap-2">
        {members.map((name, index) => (
          <div 
            key={index}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F3] border border-[#E8DED5] rounded-full text-sm text-[#222222]"
          >
            <div className="w-5 h-5 rounded-full bg-[#FED8B1] flex items-center justify-center text-[#D67D3E]">
              <User size={12} />
            </div>
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}
