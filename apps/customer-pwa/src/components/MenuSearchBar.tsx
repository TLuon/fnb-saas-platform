import React from 'react';
import { Search } from 'lucide-react';

interface MenuSearchBarProps {
  value: string;
  onChange: (val: string) => void;
}

export function MenuSearchBar({ value, onChange }: MenuSearchBarProps) {
  return (
    <div className="px-4 py-4 max-w-screen-xl mx-auto w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={20} className="text-[#6B625B]" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full pl-10 pr-4 py-3 border border-[#E8DED5] rounded-xl leading-5 bg-[#FFFFFF] placeholder-[#6B625B] focus:outline-none focus:ring-1 focus:ring-[#D67D3E] focus:border-[#D67D3E] sm:text-sm transition-colors shadow-sm"
          placeholder="Tìm kiếm món ăn, đồ uống..."
        />
      </div>
    </div>
  );
}
