'use client';
import React, { useState, useEffect } from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { VietQRDeposit } from './VietQRDeposit';

interface Props {
  tableId: string;
  lockedUntil: number | null; // null if not locked
  code?: string;
  onCancel: () => void;
  onSuccess: () => void;
  onTimeout: () => void;
}

export function TableLockModal({ tableId, lockedUntil, code, onCancel, onSuccess, onTimeout }: Props) {
  const remaining = useCountdown(lockedUntil, onTimeout);
  const [reservationCode, setReservationCode] = useState(code || '');

  useEffect(() => {
    if (code) {
      setReservationCode(code);
    } else if (lockedUntil && !reservationCode) {
      setReservationCode(`RES_${tableId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4)}_${Date.now().toString().slice(-4)}`);
    }
  }, [code, lockedUntil, tableId, reservationCode]);

  if (!lockedUntil) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  
  // Màu cảnh báo Secondary khi dưới 1 phút
  const isDanger = remaining < 60;
  const timeClass = isDanger ? 'text-[#D67D3E] animate-pulse' : 'text-[#543310]';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-[#FAF7F3] rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-[#FED8B1]">
        <div className="bg-white p-4 border-b border-gray-100 flex justify-between items-center shadow-sm">
          <h2 className="font-bold text-[#543310] text-lg">Đang giữ chỗ Bàn {tableId}</h2>
          <span className={`font-mono text-xl font-bold ${timeClass}`}>
            {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
        
        <div className="p-6 overflow-y-auto bg-white m-4 rounded-xl shadow-sm border border-[#FED8B1]">
          <VietQRDeposit 
            amount={50000} 
            reservationCode={reservationCode || `RES_${tableId}`}
            onMockSuccess={onSuccess}
          />
        </div>
        
        <div className="p-4 border-t border-gray-100 flex justify-end bg-white">
          <button 
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 transition"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
