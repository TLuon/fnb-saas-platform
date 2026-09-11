import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CheckoutButtonProps {
  isDisabled: boolean;
  itemCount: number;
  totalAmount: number;
}

export function CheckoutButton({ isDisabled, itemCount, totalAmount }: CheckoutButtonProps) {
  const router = useRouter();

  const handleCheckout = () => {
    if (!isDisabled) {
      // Vì hệ thống chưa có API tạo Order từ Cart, ta tạm nối order_id ảo 
      // để trang Checkout có thể gọi đúng API GET /orders/:id như yêu cầu của spec.
      router.push('/checkout?order_id=O-12345');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8DED5] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 md:sticky">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm text-[#6B625B]">{itemCount} món</span>
          <span className="font-bold text-[#543310] text-lg">{formatPrice(totalAmount)}</span>
        </div>
        
        <button
          onClick={handleCheckout}
          disabled={isDisabled}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-sm transition-all ${
            isDisabled 
              ? 'bg-[#E8DED5] text-[#6B625B] cursor-not-allowed'
              : 'bg-[#543310] text-white hover:bg-[#D67D3E]'
          }`}
        >
          Thanh toán <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
