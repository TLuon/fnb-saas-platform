import React from 'react';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function SessionExpiredState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-[50vh]">
      <div className="w-20 h-20 bg-[#FEE4E2] rounded-full flex items-center justify-center mb-6">
        <AlertCircle size={40} className="text-[#B42318]" />
      </div>
      <h2 className="text-xl font-bold text-[#543310] mb-2">Phiên đã hết hạn</h2>
      <p className="text-[#6B625B] mb-8 max-w-[280px]">
        Phiên đặt món chung này đã hết thời gian hoặc đã được xác nhận bởi một người khác. Vui lòng quét lại QR.
      </p>
      <Link 
        href="/menu"
        className="px-8 py-3 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#D67D3E] transition-colors shadow-sm"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
