import React from 'react';
import { Tag, ChevronRight } from 'lucide-react';

interface VoucherSelectorProps {
  selectedVoucherId?: string;
  onSelect: () => void;
}

export function VoucherSelector({ selectedVoucherId, onSelect }: VoucherSelectorProps) {
  return (
    <button 
      onClick={onSelect}
      className="w-full bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-[#E8DED5] flex items-center justify-between transition-colors hover:bg-[#FAF7F3]"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#FED8B1] text-[#D67D3E] rounded-full flex items-center justify-center">
          <Tag size={20} />
        </div>
        <div className="text-left">
          <h3 className="font-bold text-[#543310] text-sm">Voucher / Khuyến mãi</h3>
          <p className="text-xs text-[#6B625B]">
            {selectedVoucherId ? 'Đã áp dụng 1 mã' : 'Chọn hoặc nhập mã'}
          </p>
        </div>
      </div>
      <ChevronRight size={20} className="text-[#6B625B]" />
    </button>
  );
}
