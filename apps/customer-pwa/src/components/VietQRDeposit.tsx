'use client';

import React, { useEffect, useState } from 'react';
import { generateVietQRUrl, VIETCOMBANK_CONFIG, apiClient } from '@fnb/utils';
import { Copy, Check, Clock, CheckCircle2 } from 'lucide-react';

interface Props {
  amount: number;
  reservationCode: string;
  onMockSuccess: () => void;
  onMockCancel?: (reason?: string) => void;
  tenantId?: string;
}

export function VietQRDeposit({
  amount,
  reservationCode,
  onMockSuccess,
  onMockCancel,
  tenantId = '11111111-1111-1111-1111-111111111111',
}: Props) {
  const memo = `DATBAN ${reservationCode}`;
  const defaultQrUrl = generateVietQRUrl(amount, memo);
  const [qrImage, setQrImage] = useState<string>(defaultQrUrl);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);

  useEffect(() => {
    async function loadRealQr() {
      if (!reservationCode) return;
      try {
        const res: any = await apiClient.post(`/reservations/${encodeURIComponent(reservationCode)}/generate-qr`, {});
        const payload = res?.data ?? res;
        if (payload?.qr_image) setQrImage(payload.qr_image);
      } catch (err) {
        // Fallback set
      }
    }

    loadRealQr();
  }, [reservationCode, amount]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Poll reservation status until staff confirms or cancels
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (reservationCode) {
      interval = setInterval(async () => {
        try {
          const res: any = await apiClient.get(`/reservations/${encodeURIComponent(reservationCode)}`);
          const payload = res?.data ?? res;
          if (payload?.status === 'PAID') {
            onMockSuccess();
          } else if (payload?.status === 'CANCELLED') {
            const cleanReason = payload?.notes?.replace(/^Lý do hủy:\s*/, '') || 'Nhà hàng đã hủy đặt bàn cọc';
            if (onMockCancel) {
              onMockCancel(cleanReason);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [reservationCode, onMockSuccess, onMockCancel]);

  const handleCustomerConfirmedTransfer = () => {
    setIsWaiting(true);
  };

  if (isWaiting) {
    return (
      <div className="flex flex-col items-center bg-white p-8 rounded-3xl shadow-xl border border-[#FED8B1] max-w-md w-full mx-auto text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 bg-[#FEF0C7] rounded-full flex items-center justify-center relative">
          <Clock className="w-9 h-9 text-[#D67D3E] animate-pulse" />
        </div>
        
        <h3 className="text-[#543310] font-bold text-xl">Đã ghi nhận thanh toán!</h3>
        
        <p className="text-sm text-[#6B625B] leading-relaxed">
          Quán đã nhận được thông báo chuyển khoản của bạn. Nhân viên thu ngân đang đối soát và sẽ xác nhận giữ bàn ngay trong ít phút.
        </p>

        <div className="w-full bg-[#FAF7F3] border border-[#E8DED5] rounded-2xl p-4 text-xs text-[#543310] space-y-2 text-left">
          <div className="flex justify-between">
            <span className="text-[#6B625B]">Mã đặt bàn:</span>
            <span className="font-mono font-bold text-[#D67D3E]">{reservationCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B625B]">Số tiền cọc:</span>
            <span className="font-bold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B625B]">Trạng thái:</span>
            <span className="font-bold text-[#D67D3E] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#D67D3E] animate-ping inline-block"></span>
              Đang chờ nhân viên xác nhận...
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-400 italic">Vui lòng không đóng trang này trong khi chờ quán xác nhận.</p>
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

      <button 
        onClick={handleCustomerConfirmedTransfer}
        className="w-full bg-[#543310] text-white py-3.5 rounded-xl font-bold hover:bg-[#D67D3E] transition text-base shadow-md flex items-center justify-center gap-2"
      >
        <CheckCircle2 size={18} />
        <span>Tôi đã chuyển khoản thành công</span>
      </button>
    </div>
  );
}
