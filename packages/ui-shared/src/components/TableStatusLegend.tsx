import React from 'react';

export const TableStatusLegend: React.FC = () => {
  return (
    <div className="flex gap-4 items-center bg-white p-3 rounded-lg shadow-sm border border-[#E8DED5] text-xs font-bold text-gray-700">
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-full border-2 border-[#D67D3E] bg-[#FAF7F3]"></div>
        <span>Bàn trống</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-full border-2 border-[#FED8B1] bg-[#FED8B1]"></div>
        <span>Đang chọn</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-full border-2 border-[#D67D3E] bg-[#D67D3E]"></div>
        <span>Đã đặt</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-full border-2 border-[#543310] bg-[#543310]"></div>
        <span>Đang phục vụ</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded-full border-2 border-[#E8DED5] bg-[#E8DED5]"></div>
        <span>Đang dọn</span>
      </div>
    </div>
  );
};
