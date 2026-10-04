'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicHeader } from '../../components/PublicHeader';
import { PassPlanGrid } from '../../components/coffee-pass/PassPlanGrid';
import { PassPlanCard, PassPlan } from '../../components/coffee-pass/PassPlanCard';
import { SubscribeModal } from '../../components/coffee-pass/SubscribeModal';
import { useToast } from '../../components/ToastProvider';
import { apiClient } from '@fnb/utils';
import { extractSubscription, normalizePassPlans, normalizeWalletBalance } from '../../lib/coffee-pass';

export default function CoffeePassPage() {
  const router = useRouter();
  const { showInfo } = useToast();
  
  const [plans, setPlans] = useState<PassPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedPlan, setSelectedPlan] = useState<PassPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [plansRes, walletRes] = await Promise.all([
          apiClient.get('/coffee-pass/plans'),
          apiClient.get('/wallet'),
        ]);
        setPlans(normalizePassPlans(plansRes));
        setWalletBalance(normalizeWalletBalance(walletRes));
      } catch (err: any) {
        console.error('Lỗi lấy dữ liệu Coffee Pass:', err);
        setPlans([]);
        setWalletBalance(0);
        setError(err?.message || 'Không thể tải Coffee Pass lúc này.');
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
    const response = await apiClient.post('/coffee-pass/subscribe', { plan_id: planId });
    const subscription = extractSubscription(response);
    if (!subscription?.id) {
      throw new Error('Máy chủ không trả về thông tin gói đã mua.');
    }
    showInfo('Mua gói thành công!');
    router.push(`/coffee-pass/${subscription.id}`);
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

        {error ? (
          <div className="rounded-lg border border-red-200 bg-white p-6 text-center">
            <p className="font-semibold text-red-700">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-md bg-[#543310] px-4 py-2 text-sm font-bold text-white">Tải lại</button>
          </div>
        ) : (
          <PassPlanGrid plans={plans} onSubscribe={handleSubscribeClick} />
        )}
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
