'use client';
import React, { useEffect, useState } from 'react';
import { useCoffeePassStore } from '../../store/coffeePassStore';
import { useToast } from '../../components/ToastProvider';
import { useRouter } from 'next/navigation';

export default function CoffeePassPage() {
  const { activePasses, plans, fetchPlans, subscribePlan } = useCoffeePassStore();
  const { showInfo, showError } = useToast();
  const [subscribing, setSubscribing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleBuy = async (id: string, name: string, totalLimit: number) => {
    setSubscribing(true);
    const result = await subscribePlan(id, name, totalLimit);
    setSubscribing(false);

    if (result.success) {
      showInfo(`Đã mua thành công ${name}`);
    } else {
      showError(result.error || 'Đăng ký Coffee Pass thất bại');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F3] p-4 pb-20">
      <h1 className="text-2xl font-bold text-[#543310] mb-6 border-b-2 border-[#D67D3E] inline-block pb-1">Coffee Pass</h1>
      
      {activePasses.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-[#543310] mb-3 text-lg">Pass của tôi</h2>
          <div className="space-y-4">
            {activePasses.map((pass, idx) => (
              <div key={`${pass.id}-${idx}`} className="bg-gradient-to-r from-[#543310] to-[#8B5E34] p-5 rounded-2xl text-white shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-white/10 skew-x-12 transform origin-bottom"></div>
                <h3 className="font-bold text-xl mb-1">{pass.name}</h3>
                <p className="text-[#FED8B1] font-medium mb-4">Còn lại: {pass.remaining} / {pass.totalLimit} ly</p>
                <button 
                  onClick={() => router.push('/coffee-pass/ticket')}
                  className="bg-[#FED8B1] text-[#543310] px-6 py-2 rounded-lg font-bold hover:bg-white transition"
                >
                  Sử dụng ngay
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-bold text-[#543310] mb-3 text-lg">Gói Pass đang bán</h2>
      <div className="grid gap-4">
        <div className="bg-white p-5 rounded-xl border-2 border-[#FED8B1] shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#D67D3E] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">HOT</div>
          <h3 className="font-bold text-[#543310] text-xl mt-2">Gói 10 Ly Cà Phê</h3>
          <p className="text-gray-500 text-sm mt-1 mb-4">Áp dụng cho Đen đá / Bạc xỉu</p>
          <div className="text-3xl font-bold text-[#D67D3E] mb-4">250,000 ₫</div>
          <button 
            onClick={() => handleBuy('cp10', 'Gói 10 Ly Cà Phê', 10)}
            className="w-full bg-[#543310] text-[#FAF7F3] py-3 rounded-xl font-bold hover:bg-[#D67D3E] transition"
          >
            Mua ngay
          </button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
          <h3 className="font-bold text-[#543310] text-xl mt-2">Gói 30 Ly Cà Phê</h3>
          <p className="text-gray-500 text-sm mt-1 mb-4">Áp dụng cho Đen đá / Bạc xỉu</p>
          <div className="text-3xl font-bold text-[#D67D3E] mb-4">600,000 ₫</div>
          <button 
            onClick={() => handleBuy('cp30', 'Gói 30 Ly Cà Phê', 30)}
            className="w-full border-2 border-[#543310] text-[#543310] py-3 rounded-xl font-bold hover:bg-[#543310] hover:text-white transition"
          >
            Mua ngay
          </button>
        </div>
      </div>
    </div>
  );
}
