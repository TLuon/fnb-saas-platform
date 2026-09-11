'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { PublicHeader } from '../components/PublicHeader';
import { BranchInfoBar } from '../components/BranchInfoBar';
import { FeaturedMenuSection } from '../components/FeaturedMenuSection';
import { ContactFooter } from '../components/ContactFooter';

export default function Home() {
  const router = useRouter();
  const { requireAuth } = useAuthGuard();

  const handleReservation = () => {
    // If Guest, trigger LoginRequiredModal via auth guard
    requireAuth(() => {
      router.push('/reservation');
    });
  };

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col">
      <PublicHeader />
      <BranchInfoBar />
      
      {/* Hero / Primary Actions Area */}
      <section className="bg-white py-16 px-4 border-b border-[#E8DED5]">
        <div className="max-w-screen-xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black font-serif text-[#543310] mb-6">
            Hương vị tuyệt hảo,<br />Trải nghiệm khó quên.
          </h1>
          <p className="text-[#6B625B] max-w-2xl mx-auto mb-10 text-lg">
            Chào mừng bạn đến với hệ thống cửa hàng của chúng tôi. Khám phá thực đơn đa dạng và đặt bàn ngay để tận hưởng dịch vụ tốt nhất.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => router.push('/menu')}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#543310] text-[#FFFFFF] font-bold rounded hover:bg-[#D67D3E] transition-colors shadow-sm"
            >
              Xem thực đơn
            </button>
            <button 
              onClick={handleReservation}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#FFFFFF] text-[#543310] font-bold border-2 border-[#543310] rounded hover:bg-[#FAF7F3] transition-colors shadow-sm"
            >
              Đặt bàn ngay
            </button>
          </div>
        </div>
      </section>

      <div className="flex-1">
        <FeaturedMenuSection />
      </div>
      
      <ContactFooter />
    </main>
  );
}
