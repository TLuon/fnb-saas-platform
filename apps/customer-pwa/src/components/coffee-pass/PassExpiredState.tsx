import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export function PassExpiredState() {
  return (
    <div className="bg-[#FEE4E2] border border-[#FCA5A5] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 text-[#B42318] shadow-sm">
        <AlertTriangle size={32} />
      </div>
      <h3 className="text-xl font-bold text-[#B42318] mb-2">Gói đã hết hạn hoặc hết lượt</h3>
      <p className="text-[#B42318]/80 text-sm mb-6 max-w-xs">
        Rất tiếc, gói Coffee Pass của bạn đã không còn hiệu lực để sử dụng. Vui lòng mua gói mới để tiếp tục nhận ưu đãi.
      </p>
      
      <Link 
        href="/coffee-pass" 
        className="w-full max-w-xs py-3 bg-[#B42318] text-white font-bold rounded-xl hover:bg-[#991B1B] transition-colors shadow-sm text-center block"
      >
        Mua gói mới
      </Link>
    </div>
  );
}
