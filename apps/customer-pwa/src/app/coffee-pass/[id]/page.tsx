'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ActivePassHeader } from '../../../components/coffee-pass/ActivePassHeader';
import { RedemptionProgress } from '../../../components/coffee-pass/RedemptionProgress';
import { RotatingCodePanel } from '../../../components/coffee-pass/RotatingCodePanel';
import { PassExpiredState } from '../../../components/coffee-pass/PassExpiredState';
import { apiClient } from '@fnb/utils';

export default function CoffeePassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const passId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [passData, setPassData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPass = async () => {
      try {
        setLoading(true);
        setError(null);
        const res: any = await apiClient.get(`/coffee-pass/my-passes/${passId}`);
        setPassData(res);
      } catch (err: any) {
        console.error('Lỗi tải gói pass:', err);
        setPassData(null);
        setError(err?.message || 'Không thể tải thông tin Coffee Pass.');
      } finally {
        setLoading(false);
      }
    };
    fetchPass();
  }, [passId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F3] flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#543310]"></div>
      </main>
    );
  }

  if (error || !passData) {
    return <main className="min-h-screen bg-[#FAF7F3] flex flex-col justify-center items-center p-6 text-center"><p className="font-bold text-[#B42318]">{error || 'Không tìm thấy Coffee Pass.'}</p><button type="button" onClick={() => router.push('/coffee-pass')} className="mt-4 rounded-md bg-[#543310] px-4 py-2 font-bold text-white">Quay lại danh sách gói</button></main>;
  }

  const isExpired = !passData.is_active || passData.remaining_redemptions <= 0 || new Date(passData.expires_at) < new Date();

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col pb-24">
      <div className="bg-[#FFFFFF] border-b border-[#E8DED5] p-4 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
        <button 
          onClick={() => router.push('/coffee-pass')}
          className="p-2 -ml-2 text-[#543310] hover:bg-[#FAF7F3] rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold font-serif text-[#543310]">Sử dụng gói</h1>
      </div>

      <div className="max-w-md mx-auto w-full p-4 mt-2">
        <ActivePassHeader planName={passData.plan_name} expiresAt={passData.expires_at} />
        
        <RedemptionProgress remaining={passData.remaining_redemptions} total={passData.total_redemptions} />

        {isExpired ? (
          <PassExpiredState />
        ) : (
          <RotatingCodePanel passId={passId} />
        )}
      </div>
    </main>
  );
}
