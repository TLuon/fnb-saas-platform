import React from 'react';

interface WalletBalanceRowProps {
  balance: number;
}

export function WalletBalanceRow({ balance }: WalletBalanceRowProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="bg-[#FAF7F3] p-3 rounded-lg border border-[#E8DED5] flex justify-between items-center text-sm">
      <span className="text-[#6B625B]">Số dư ví hiện tại</span>
      <span className="font-bold text-[#543310]">{formatPrice(balance)}</span>
    </div>
  );
}
