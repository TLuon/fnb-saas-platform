'use client';
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  amount: number;
  reservationCode: string;
  onMockSuccess: () => void;
}

export function VietQRDeposit({ amount, reservationCode, onMockSuccess }: Props) {
  const qrData = `mock_vietqr_data_amount_${amount}_code_${reservationCode}`;

  return (
    <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow border border-[#FED8B1]">
      <h3 className="text-[#D67D3E] font-bold text-lg mb-4">Thanh toán đặt cọc</h3>
      <div className="bg-[#FAF7F3] p-4 rounded-xl mb-4">
        <QRCodeSVG value={qrData} size={200} />
      </div>
      <p className="text-gray-600 mb-1">Quét mã QR qua ứng dụng Ngân hàng</p>
      <p className="font-bold text-[#543310] text-xl mb-6">{amount.toLocaleString()} ₫</p>
      
      <button 
        onClick={onMockSuccess}
        className="w-full bg-[#543310] text-white py-2 rounded font-medium hover:bg-[#D67D3E] transition"
      >
        [Mock] Giả lập Thanh toán Thành công
      </button>
    </div>
  );
}
