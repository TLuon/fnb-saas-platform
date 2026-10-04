'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { PublicHeader } from '../../../components/PublicHeader';
import { ReservationLockModal } from '../../../components/ReservationLockModal';
import { VietQRDeposit } from '../../../components/VietQRDeposit';
import { ReservationResult, ReservationResultStatus } from '../../../components/ReservationResult';
import { DepositNotificationModal } from '../../../components/DepositNotificationModal';
import { apiClient, authStore, parseToken } from '@fnb/utils';
import { useStore } from 'zustand';

export default function ReservationPage() {
  const params = useParams();
  const code = (params?.code as string) || '';
  const searchParams = useSearchParams();
  const tableName = searchParams.get('tableName') || '';
  const tenantId = useStore(authStore, (state) => state.tenantId);
  const accessToken = useStore(authStore, (state) => state.accessToken);
  
  // Get the auth user sub (UUID) from JWT
  const userSub = accessToken ? parseToken(accessToken)?.sub : null;

  const [viewState, setViewState] = useState<'LOADING' | 'LOCK_MODAL' | 'QR_PAYMENT' | 'RESULT'>('LOADING');
  const [resultStatus, setResultStatus] = useState<ReservationResultStatus>('SUCCESS');
  
  const [amount, setAmount] = useState(0);
  const [expiresAt, setExpiresAt] = useState('');

  // Deposit Notification Modal state
  const [showPopupModal, setShowPopupModal] = useState(false);
  const [popupType, setPopupType] = useState<'CONFIRMED' | 'CANCELLED'>('CONFIRMED');
  const [cancelReason, setCancelReason] = useState('');

  // Socket listener for staff confirmation or cancellation
  useEffect(() => {
    if (!code) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    let socket: any;
    const token = accessToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null);

    import('socket.io-client').then(({ io }) => {
      socket = io(wsUrl, {
        auth: token ? { token: `Bearer ${token}` } : undefined,
      });

      // Listen for order/reservation status changes
      socket.on('order_status_changed', (data: any) => {
        const matchesCode = data?.reservation_code === code || data?.order_code === code || !data?.reservation_code;
        if (matchesCode) {
          if (data.status === 'PAID') {
            setPopupType('CONFIRMED');
            setShowPopupModal(true);
            setResultStatus('SUCCESS');
            setViewState('RESULT');
          } else if (data.status === 'CANCELLED') {
            setPopupType('CANCELLED');
            setCancelReason(data.reason || 'Nhân viên nhà hàng đã hủy giữ bàn');
            setShowPopupModal(true);
            setResultStatus('FAIL');
            setViewState('RESULT');
          }
        }
      });
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [code, accessToken]);

  // Generate QR and load reservation info
  useEffect(() => {
    if (!code) return;

    const generateQR = async () => {
      try {
        const res: any = await apiClient.post(`/reservations/${code}/generate-qr`, {});
        const payload = res?.data || res;
        const depositAmount = Number(payload?.amount ?? payload?.deposit_amount ?? 50000);
        const expiry = payload?.expires_at || new Date(Date.now() + 600_000).toISOString();
        
        setAmount(depositAmount);
        setExpiresAt(expiry);
        setViewState('LOCK_MODAL');
      } catch (err) {
        console.error('Failed to generate QR', err);
        setAmount(50000);
        setExpiresAt(new Date(Date.now() + 600_000).toISOString());
        setViewState('LOCK_MODAL');
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

  const handlePaymentSuccess = useCallback(() => {
    setPopupType('CONFIRMED');
    setShowPopupModal(true);
    setResultStatus('SUCCESS');
    setViewState('RESULT');
  }, []);

  const handlePaymentCancel = useCallback((reason?: string) => {
    setPopupType('CANCELLED');
    setCancelReason(reason || 'Nhà hàng đã hủy đặt bàn cọc');
    setShowPopupModal(true);
    setResultStatus('FAIL');
    setViewState('RESULT');
  }, []);

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col pb-24 relative">
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
            onMockCancel={handlePaymentCancel}
          />
        )}

        {viewState === 'RESULT' && (
          <ReservationResult 
            status={resultStatus}
            reservationCode={code}
            tableName={tableName}
          />
        )}
      </div>

      {/* Centered Notification Popup Form */}
      <DepositNotificationModal
        isOpen={showPopupModal}
        type={popupType}
        reservationCode={code}
        tableName={tableName}
        reason={cancelReason}
        onClose={() => setShowPopupModal(false)}
      />
    </main>
  );
}
