import React from 'react';

interface PaymentSummaryProps {
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
}

export function PaymentSummary({ subtotal, discount = 0, total, paymentMethod }: PaymentSummaryProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'VIETQR': return 'Chuyển khoản (VietQR)';
      case 'WALLET': return 'Ví FNB';
      case 'COFFEE_PASS': return 'Gói Coffee Pass';
      default: return method;
    }
  };

  return (
    <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-[#E8DED5] space-y-3">
      <h3 className="font-bold text-[#543310] mb-3 text-sm">Thanh toán</h3>
      
      {paymentMethod && (
        <div className="flex justify-between text-sm">
          <span className="text-[#6B625B]">Phương thức</span>
          <span className="font-bold text-[#222222]">{getPaymentMethodLabel(paymentMethod)}</span>
        </div>
      )}

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
        <span className="font-bold text-[#543310]">Tổng cộng</span>
        <span className="text-xl font-bold text-[#543310]">{formatPrice(total)}</span>
      </div>
    </div>
  );
}
