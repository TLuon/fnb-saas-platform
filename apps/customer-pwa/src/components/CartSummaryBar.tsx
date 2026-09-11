import React from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, ChevronRight } from 'lucide-react';

interface CartSummaryBarProps {
  itemCount: number;
  totalPrice: number;
}

export function CartSummaryBar({ itemCount, totalPrice }: CartSummaryBarProps) {
  const router = useRouter();

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#543310] text-[#FFFFFF] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-safe animate-slide-up">
      <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between cursor-pointer hover:bg-[#43290D] transition-colors" onClick={() => router.push('/cart')}>
        <div className="flex items-center gap-4">
          <div className="relative p-2">
            <ShoppingCart size={24} />
            <span className="absolute top-0 right-0 bg-[#D67D3E] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#543310]">
              {itemCount}
            </span>
          </div>
          <div>
            <div className="text-sm text-[#E8DED5]">Tổng tạm tính</div>
            <div className="font-bold text-lg">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPrice)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 font-bold">
          <span>Thanh toán</span>
          <ChevronRight size={20} />
        </div>
      </div>
    </div>
  );
}
