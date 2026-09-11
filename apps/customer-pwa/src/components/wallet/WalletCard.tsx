import React from 'react';
import { Wallet } from 'lucide-react';

interface WalletCardProps {
  customerName: string;
  mainBalance: number;
  promoBalance: number;
}

export function WalletCard({ customerName, mainBalance, promoBalance }: WalletCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const total = mainBalance + promoBalance;

  return (
    <div className="relative overflow-hidden bg-[#543310] rounded-2xl p-6 shadow-lg border border-[#D67D3E]/30 text-white w-full max-w-sm">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#D67D3E] opacity-10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#FED8B1] opacity-10 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none" />

      <div className="relative z-10 flex justify-between items-start mb-8">
        <div>
          <span className="text-sm text-[#E8DED5]/70 uppercase tracking-wider font-bold">FNB Wallet</span>
          <h2 className="text-lg font-bold mt-1 text-[#FED8B1]">{customerName}</h2>
        </div>
        <div className="p-2 bg-[#FAF7F3]/10 rounded-xl backdrop-blur-sm">
          <Wallet className="text-[#FED8B1]" size={24} />
        </div>
      </div>

      <div className="relative z-10 space-y-4">
        <div>
          <span className="text-xs text-[#E8DED5]/70">Tài khoản chính</span>
          <p className="text-2xl font-bold font-serif mt-1">{formatPrice(mainBalance)}</p>
        </div>

        <div className="flex justify-between items-end border-t border-[#E8DED5]/10 pt-4">
          <div>
            <span className="text-xs text-[#E8DED5]/70">Tài khoản KM</span>
            <p className="text-sm font-bold text-[#D67D3E] mt-0.5">{formatPrice(promoBalance)}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-[#E8DED5]/70">Tổng số dư</span>
            <p className="text-base font-bold text-[#6B625B] mt-0.5">{formatPrice(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
