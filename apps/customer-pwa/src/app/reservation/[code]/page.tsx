'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PublicHeader } from '../../../components/PublicHeader';
import { ReservationLockModal } from '../../../components/ReservationLockModal';
import { VietQRDeposit } from '../../../components/VietQRDeposit';
import { ReservationResult, ReservationResultStatus } from '../../../components/ReservationResult';
import { apiClient, authStore } from '@fnb/utils';
import { useStore } from 'zustand';

export default function ReservationPage() {
  const params = useParams();
  const code = (params?.code as string) || '';
  const tenantId = useStore(authStore, (state) => state.tenantId);

  const [viewState, setViewState] = useState<'LOADING' | 'LOCK_MODAL' | 'QR_PAYMENT' | 'RESULT'>('LOADING');
  const [resultStatus, setResultStatus] = useState<ReservationResultStatus>('SUCCESS');
  
  const [amount, setAmount] = useState(0);
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (!code) return;

    const generateQR = async () => {
      try {
        const payload: any = await apiClient.post(`/reservations/${code}/generate-qr`, {});
        const depositAmount = Number(payload?.amount);
        if (!Number.isFinite(depositAmount) || !payload?.expires_at) {
          throw new Error('Dữ liệu giữ bàn không hợp lệ');
        }
        setAmount(depositAmount);
        setExpiresAt(payload.expires_at);
        setViewState('LOCK_MODAL');
      } catch (err) {
        console.error('Failed to generate QR', err);
        setResultStatus('FAIL');
        setViewState('RESULT');
      }
    };

    generateQR();
  }, [code]);

  const handleProceedToPayment = () => {
    setViewState('QR_PAYMENT');
  };

  const handleExpired = async () => {
    try {
      await apiClient.delete(`/reservations/${code}`);
    } catch (err) {
      console.error('Failed to cancel reservation', err);
    } finally {
      setResultStatus('EXPIRED');
      setViewState('RESULT');
    }
  };

  const handlePaymentSuccess = () => {
    setResultStatus('SUCCESS');
    setViewState('RESULT');
  };

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col pb-24">
      <PublicHeader />
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {viewState === 'LOADING' && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#543310]"></div>
        )}

        {viewState === 'LOCK_MODAL' && (
          <ReservationLockModal 
            reservationCode={code}
            depositAmount={amount}
            expiresAt={expiresAt}
            onProceed={handleProceedToPayment}
            onExpired={handleExpired}
          />
        )}

        {viewState === 'QR_PAYMENT' && (
          <VietQRDeposit
            amount={amount}
            reservationCode={code}
            tenantId={tenantId || undefined}
            onMockSuccess={handlePaymentSuccess}
          />
        )}

        {viewState === 'RESULT' && (
          <ReservationResult 
            status={resultStatus}
            reservationCode={code}
          />
        )}
      </div>
    </main>
  );
}
