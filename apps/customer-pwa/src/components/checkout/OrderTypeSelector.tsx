import React from 'react';
import { Store, ShoppingBag } from 'lucide-react';

interface OrderTypeSelectorProps {
  type: 'DINE_IN' | 'TAKEAWAY';
  onChange: (type: 'DINE_IN' | 'TAKEAWAY') => void;
  tableName?: string;
}

export function OrderTypeSelector({ type, onChange, tableName }: OrderTypeSelectorProps) {
  return (
    <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-[#E8DED5]">
      <h3 className="font-bold text-[#543310] mb-3 text-sm">Hình thức nhận món</h3>
      <div className="flex gap-3">
        <button
          onClick={() => onChange('DINE_IN')}
          className={`flex-1 p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
            type === 'DINE_IN' ? 'border-[#D67D3E] bg-[#FED8B1]/30' : 'border-[#E8DED5] hover:bg-[#FAF7F3]'
          }`}
        >
          <Store size={24} className={type === 'DINE_IN' ? 'text-[#D67D3E]' : 'text-[#6B625B]'} />
          <span className={`text-sm font-bold ${type === 'DINE_IN' ? 'text-[#543310]' : 'text-[#6B625B]'}`}>Tại bàn</span>
        </button>

        <button
          onClick={() => onChange('TAKEAWAY')}
          className={`flex-1 p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
            type === 'TAKEAWAY' ? 'border-[#D67D3E] bg-[#FED8B1]/30' : 'border-[#E8DED5] hover:bg-[#FAF7F3]'
          }`}
        >
          <ShoppingBag size={24} className={type === 'TAKEAWAY' ? 'text-[#D67D3E]' : 'text-[#6B625B]'} />
          <span className={`text-sm font-bold ${type === 'TAKEAWAY' ? 'text-[#543310]' : 'text-[#6B625B]'}`}>Mang đi</span>
        </button>
      </div>

      {type === 'DINE_IN' && (
        <div className="mt-3 p-3 bg-[#FAF7F3] rounded-lg border border-[#E8DED5] flex justify-between items-center text-sm">
          <span className="text-[#6B625B]">Số bàn</span>
          <span className="font-bold text-[#543310]">{tableName || 'Đang chọn...'}</span>
        </div>
      )}
    </div>
  );
}
