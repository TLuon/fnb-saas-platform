import React from 'react';

interface PriceSummaryProps {
  subtotal: number;
  discount?: number;
}

export function PriceSummary({ subtotal, discount = 0 }: PriceSummaryProps) {
  const total = subtotal - discount;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-[#E8DED5] space-y-3">
      <div className="flex justify-between text-sm text-[#6B625B]">
        <span>Tạm tính</span>
        <span className="font-bold text-[#222222]">{formatPrice(subtotal)}</span>
      </div>
      
      {discount > 0 && (
        <div className="flex justify-between text-sm text-[#D67D3E]">
          <span>Giảm giá</span>
          <span className="font-bold">- {formatPrice(discount)}</span>
        </div>
      )}
      
      <div className="border-t border-[#E8DED5] pt-3 flex justify-between items-center">
        <span className="font-bold text-[#543310]">Tổng thanh toán</span>
        <span className="text-2xl font-bold text-[#543310]">{formatPrice(Math.max(0, total))}</span>
      </div>
    </div>
  );
}
