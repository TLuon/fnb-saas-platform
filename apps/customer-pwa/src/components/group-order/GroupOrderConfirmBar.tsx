import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GroupOrderConfirmBarProps {
  totalAmount: number;
  itemCount: number;
  onConfirm: () => void;
  isDisabled: boolean;
}

export function GroupOrderConfirmBar({ totalAmount, itemCount, onConfirm, isDisabled }: GroupOrderConfirmBarProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8DED5] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 md:sticky">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm text-[#6B625B]">{itemCount} món (Chung)</span>
          <span className="font-bold text-[#543310] text-lg">{formatPrice(totalAmount)}</span>
        </div>
        
        <button
          onClick={onConfirm}
          disabled={isDisabled}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-sm transition-all ${
            isDisabled 
              ? 'bg-[#E8DED5] text-[#6B625B] cursor-not-allowed'
              : 'bg-[#543310] text-white hover:bg-[#D67D3E]'
          }`}
        >
          Xác nhận đặt món <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
