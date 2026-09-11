import React from 'react';

interface RedemptionProgressProps {
  remaining: number;
  total: number;
}

export function RedemptionProgress({ remaining, total }: RedemptionProgressProps) {
  const percentage = Math.min(Math.max((remaining / total) * 100, 0), 100);
  const used = total - remaining;

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E8DED5] mb-6">
      <div className="flex justify-between items-end mb-3">
        <div>
          <span className="text-sm text-[#6B625B]">Lượt khả dụng</span>
          <div className="text-2xl font-bold font-serif text-[#543310] leading-none mt-1">
            {remaining} <span className="text-sm font-sans text-[#6B625B] font-normal">/ {total}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-[#6B625B]">Đã dùng:</span>
          <span className="text-sm font-bold text-[#D67D3E] ml-1">{used}</span>
        </div>
      </div>

      <div className="h-3 w-full bg-[#E8DED5] rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#543310] rounded-full transition-all duration-1000 ease-out relative"
          style={{ width: `${percentage}%` }}
        >
          {/* Subtle shine effect on the progress bar */}
          <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
        </div>
      </div>
      
      {remaining === 0 && (
        <p className="text-xs text-[#B42318] mt-3 text-center font-bold">
          Bạn đã sử dụng hết lượt của gói này.
        </p>
      )}
    </div>
  );
}
