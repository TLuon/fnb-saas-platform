import React from 'react';
import { Crown } from 'lucide-react';

interface ActivePassHeaderProps {
  planName: string;
  expiresAt: string;
}

export function ActivePassHeader({ planName, expiresAt }: ActivePassHeaderProps) {
  const isExpired = new Date(expiresAt) < new Date();

  return (
    <div className="bg-[#543310] rounded-2xl p-5 shadow-lg relative overflow-hidden text-white mb-6">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#D67D3E] opacity-20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
      
      <div className="relative z-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-[#FED8B1]/20 rounded-full flex items-center justify-center flex-none backdrop-blur-sm border border-[#FED8B1]/30">
          <Crown className="text-[#FED8B1]" size={24} />
        </div>
        
        <div>
          <span className="text-xs text-[#E8DED5]/80 uppercase tracking-wider font-bold mb-1 block">Gói đang dùng</span>
          <h2 className="text-xl font-bold font-serif text-[#FED8B1] leading-tight">{planName}</h2>
          
          <div className="mt-1 flex items-center gap-2 text-sm text-[#E8DED5]">
            <span className={isExpired ? 'text-[#FEE4E2] font-bold' : ''}>
              {isExpired ? 'Đã hết hạn vào: ' : 'Hạn sử dụng: '}
            </span>
            <span>{new Date(expiresAt).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
