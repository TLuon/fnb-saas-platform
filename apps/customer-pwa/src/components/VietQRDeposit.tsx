'use client';
import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  amount: number;
  reservationCode: string;
  onMockSuccess: () => void;
  tenantId?: string;
}

export function VietQRDeposit({ amount, reservationCode, onMockSuccess, tenantId = '11111111-1111-1111-1111-111111111111' }: Props) {
  const [qrString, setQrString] = useState<string>(`VIETQR|${reservationCode}|${amount}`);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    async function loadRealQr() {
      if (!reservationCode) return;
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        let token = '';
        if (typeof document !== 'undefined') {
          const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
          token = match ? decodeURIComponent(match[1]) : (localStorage.getItem('access_token') || '');
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${baseUrl}/reservations/${encodeURIComponent(reservationCode)}/generate-qr`, {
          method: 'POST',
          headers,
        });

        if (res.ok) {
          const resJson = await res.json();
          const payload = resJson?.data ?? resJson;
          if (payload.qr_string) setQrString(payload.qr_string);
          if (payload.qr_image) setQrImage(payload.qr_image);
        } else {
          setQrString(`VIETQR|${reservationCode}|${amount}`);
        }
      } catch (err) {
        // Fallback to formatted QR string
        setQrString(`VIETQR|${reservationCode}|${amount}`);
      }
    }

    loadRealQr();
  }, [reservationCode, amount]);

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setPaymentError('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      // Call backend simulated payment webhook
      const response = await fetch(`${baseUrl}/reservations/webhook/mock-payment/${tenantId}?secret=dev-mock-secret-key-12345`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': 'dev-mock-secret-key-12345',
        },
        body: JSON.stringify({
          raw_transfer_content: reservationCode,
          amount: amount,
          bank_reference: `SIM_BANK_${Date.now()}`,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message || 'Không thể xác nhận thanh toán đặt cọc');
      }
      onMockSuccess();
    } catch (err) {
      console.error('Lỗi chi tiết webhook:', err);
      setPaymentError(err instanceof Error ? err.message : 'Không thể xác nhận thanh toán đặt cọc');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow border border-[#FED8B1]">
      <h3 className="text-[#D67D3E] font-bold text-lg mb-4">Thanh toán đặt cọc</h3>
      <div className="bg-[#FAF7F3] p-4 rounded-xl mb-4 flex items-center justify-center min-w-[200px] min-h-[200px]">
        {qrImage ? (
          <img src={qrImage} alt="VietQR Payment Code" className="w-[200px] h-[200px] object-contain" />
        ) : (
          <QRCodeSVG value={qrString} size={200} />
        )}
      </div>
      <p className="text-gray-600 mb-1">Quét mã QR qua ứng dụng Ngân hàng</p>
      <p className="text-xs text-gray-400 mb-2 font-mono">Mã giữ chỗ: {reservationCode}</p>
      <p className="font-bold text-[#543310] text-xl mb-6">{amount.toLocaleString()} ₫</p>

      {paymentError && (
        <p className="mb-4 w-full border border-[#FDA29B] bg-[#FEE4E2] p-3 text-sm text-[#B42318]">
          {paymentError}
        </p>
      )}
      
      <button 
        onClick={handleSimulatePayment}
        disabled={isProcessing}
        className="w-full bg-[#543310] text-white py-2.5 rounded font-medium hover:bg-[#D67D3E] transition disabled:opacity-50"
      >
        {isProcessing ? 'Đang xác nhận...' : 'Giả lập Thanh toán Thành công'}
      </button>
    </div>
  );
}
