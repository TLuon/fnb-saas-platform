'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, FileText } from 'lucide-react';
import { PublicHeader } from '../../components/PublicHeader';

export default function OrderSuccessPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col">
      <PublicHeader />
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-24 h-24 bg-[#E2F3E5] rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={48} className="text-[#237A57]" />
        </div>
        
        <h1 className="text-3xl font-bold font-serif text-[#543310] mb-2 text-center">Đặt món thành công!</h1>
        <p className="text-[#6B625B] text-center mb-8 max-w-sm">
          Đơn hàng của bạn đã được ghi nhận và đang chờ pha chế. Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.
        </p>

        <div className="flex flex-col w-full max-w-sm gap-3">
          <button 
            onClick={() => router.push('/orders')}
            className="w-full py-4 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#D67D3E] transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <FileText size={20} /> Xem lịch sử đơn hàng
          </button>
          
          <button 
            onClick={() => router.push('/menu')}
            className="w-full py-4 bg-white text-[#543310] font-bold rounded-xl border border-[#E8DED5] hover:bg-[#FAF7F3] transition-colors shadow-sm"
          >
            Quay lại Menu
          </button>
        </div>
      </div>
    </main>
  );
}
