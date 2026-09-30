'use client';
import React, { useEffect, useState } from 'react';
import { generateVietQRUrl, VIETCOMBANK_CONFIG } from '@fnb/utils';
import { Copy, Check } from 'lucide-react';

interface Props {
  amount: number;
  reservationCode: string;
  onMockSuccess: () => void;
  tenantId?: string;
}

export function VietQRDeposit({ amount, reservationCode, onMockSuccess, tenantId = '11111111-1111-1111-1111-111111111111' }: Props) {
  const memo = `DATBAN ${reservationCode}`;
  const defaultQrUrl = generateVietQRUrl(amount, memo);
  const [qrImage, setQrImage] = useState<string>(defaultQrUrl);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    async function loadRealQr() {
      if (!reservationCode) return;
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
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
          if (payload.qr_image) setQrImage(payload.qr_image);
        }
      } catch (err) {
        // Fallback already set to defaultQrUrl
      }
    }

    loadRealQr();
  }, [reservationCode, amount]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const [isWaiting, setIsWaiting] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWaiting) {
      interval = setInterval(async () => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
          let token = '';
          if (typeof document !== 'undefined') {
            const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
            token = match ? decodeURIComponent(match[1]) : (localStorage.getItem('access_token') || '');
          }
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(`${baseUrl}/reservations/${encodeURIComponent(reservationCode)}`, { headers });
          if (res.ok) {
            const data = await res.json();
            const payload = data?.data ?? data;
            if (payload?.status === 'PAID') {
              onMockSuccess();
            } else if (payload?.status === 'CANCELLED') {
              window.location.reload(); // Simple reload will show expired state
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isWaiting, reservationCode, onMockSuccess]);

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    setPaymentError('');
    // Instead of auto-confirming via webhook, we just show a waiting state
    // The staff will confirm it manually on their dashboard.
    setTimeout(() => {
      setIsWaiting(true);
      setIsProcessing(false);
    }, 1000);
  };

  if (isWaiting) {
    return (
      <div className="flex flex-col items-center bg-white p-6 rounded-2xl shadow-lg border border-[#FED8B1] max-w-md w-full mx-auto text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
        <h3 className="text-[#543310] font-bold text-xl mb-2">Đang xử lý thanh toán</h3>
        <p className="text-sm text-[#6B625B] mb-6">
          Hệ thống đã nhận được yêu cầu. Nhân viên đang kiểm tra và xác nhận tiền cọc của bạn. Vui lòng không đóng trang này...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-white p-6 rounded-2xl shadow-lg border border-[#FED8B1] max-w-md w-full mx-auto">
      <h3 className="text-[#543310] font-bold text-xl mb-1">Thanh toán cọc giữ bàn</h3>
      <p className="text-xs text-[#6B625B] mb-4 text-center">Quét mã QR bằng ứng dụng ngân hàng bất kỳ</p>

      {/* QR Code Container */}
      <div className="bg-[#FAF7F3] p-4 rounded-xl mb-6 flex flex-col items-center justify-center border border-[#E8DED5]">
        <img src={qrImage} alt="Vietcombank VietQR Code" className="w-[240px] h-[240px] object-contain rounded-lg" />
        <span className="text-[11px] text-gray-500 mt-2 font-mono">Tự động điền tiền & nội dung</span>
      </div>

      {/* Account Details Box */}
      <div className="w-full bg-[#FDFBF7] border border-[#FED8B1] rounded-xl p-4 space-y-3 mb-6 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-[#6B625B]">Ngân hàng:</span>
          <span className="font-semibold text-[#543310]">{VIETCOMBANK_CONFIG.bankName}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[#6B625B]">Số tài khoản:</span>
          <div className="flex items-center gap-1.5 font-bold text-[#543310] font-mono">
            <span>{VIETCOMBANK_CONFIG.accountNo}</span>
            <button 
              onClick={() => handleCopy(VIETCOMBANK_CONFIG.accountNo, 'acc')}
              className="p-1 text-gray-400 hover:text-[#D67D3E] transition"
              title="Sao chép số tài khoản"
            >
              {copiedField === 'acc' ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[#6B625B]">Chủ tài khoản:</span>
          <span className="font-bold text-[#543310]">{VIETCOMBANK_CONFIG.accountName}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[#6B625B]">Nội dung CK:</span>
          <div className="flex items-center gap-1.5 font-bold text-[#D67D3E] font-mono">
            <span>{memo}</span>
            <button 
              onClick={() => handleCopy(memo, 'memo')}
              className="p-1 text-gray-400 hover:text-[#D67D3E] transition"
              title="Sao chép nội dung chuyển khoản"
            >
              {copiedField === 'memo' ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-[#FED8B1] flex justify-between items-center">
          <span className="text-[#6B625B] font-medium">Số tiền cọc:</span>
          <span className="font-bold text-[#D67D3E] text-lg">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
          </span>
        </div>
      </div>

      {paymentError && (
        <p className="mb-4 w-full border border-[#FDA29B] bg-[#FEE4E2] p-3 text-sm text-[#B42318] rounded-lg">
          {paymentError}
        </p>
      )}

      <button 
        onClick={handleConfirmPayment}
        disabled={isProcessing}
        className="w-full bg-[#543310] text-white py-3 rounded-xl font-bold hover:bg-[#D67D3E] transition disabled:opacity-50 text-base shadow-md"
      >
        {isProcessing ? 'Đang ghi nhận...' : 'Tôi đã chuyển khoản thành công'}
      </button>
    </div>
  );
}

