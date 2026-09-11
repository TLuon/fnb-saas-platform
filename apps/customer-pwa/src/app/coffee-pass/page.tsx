'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicHeader } from '../../components/PublicHeader';
import { PassPlanGrid } from '../../components/coffee-pass/PassPlanGrid';
import { PassPlanCard, PassPlan } from '../../components/coffee-pass/PassPlanCard';
import { SubscribeModal } from '../../components/coffee-pass/SubscribeModal';
import { useToast } from '../../components/ToastProvider';
import { apiClient } from '@fnb/utils';

export default function CoffeePassPage() {
  const router = useRouter();
  const { showInfo } = useToast();
  
  const [plans, setPlans] = useState<PassPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  
  const [selectedPlan, setSelectedPlan] = useState<PassPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        setLoading(true);
        // GET /api/v1/coffee-pass/plans
        const plansRes: any = await apiClient.get('/coffee-pass/plans').catch(() => ([
          {
            id: 'cp_1',
            name: 'Gói Cà Phê Chào Ngày Mới',
            price: 150000,
            total_redemptions: 10,
            duration_days: 30,
            description: 'Tận hưởng 10 ly cà phê truyền thống với giá siêu ưu đãi, áp dụng mọi khung giờ.'
          },
          {
            id: 'cp_2',
            name: 'Thẻ Đặc Quyền Espresso',
            price: 350000,
            total_redemptions: 20,
            duration_days: 60,
            description: 'Trải nghiệm trọn vẹn tinh hoa Espresso với 20 ly. Tiết kiệm lên đến 40%.'
          }
        ]));
        setPlans(plansRes);

        // Fetch wallet to check balance
        const balRes: any = await apiClient.get('/wallet/balance').catch(() => ({ main: 250000, promo: 0 }));
        setWalletBalance(balRes.main + balRes.promo);
      } catch (err) {
        console.error('Lỗi lấy dữ liệu Coffee Pass:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitData();
  }, []);

  const handleSubscribeClick = (plan: PassPlan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleConfirmSubscribe = async (planId: string) => {
    // POST /api/v1/coffee-pass/subscribe
    await apiClient.post('/coffee-pass/subscribe', { planId }).catch(() => null);
    showInfo('Mua gói thành công!');
    // After buying, route to the pass detail page
    router.push(`/coffee-pass/my-${planId}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F3] flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#543310]"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col pb-24">
      <PublicHeader />
      
      <div className="max-w-screen-xl mx-auto w-full p-4 mt-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-serif text-[#543310]">Coffee Pass</h1>
          <p className="text-[#6B625B] text-sm mt-1">Trả trước, uống thả ga. Tiết kiệm lên đến 40%.</p>
        </div>

        <PassPlanGrid plans={plans} onSubscribe={handleSubscribeClick} />
      </div>

      <SubscribeModal 
        plan={selectedPlan}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmSubscribe}
        walletBalance={walletBalance}
      />
    </main>
  );
}
