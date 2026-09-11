import React, { useEffect, useState } from 'react';
import { Clock, ShieldCheck } from 'lucide-react';

interface ReservationLockModalProps {
  reservationCode: string;
  depositAmount: number;
  expiresAt: string; // ISO date string
  onProceed: () => void;
  onExpired: () => void;
}

export function ReservationLockModal({ reservationCode, depositAmount, expiresAt, onProceed, onExpired }: ReservationLockModalProps) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = Math.floor((expiry - now) / 1000);
      return diff > 0 ? diff : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpired]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#FFFFFF] border-2 border-[#FED8B1] rounded-2xl p-6 shadow-lg max-w-sm w-full mx-auto animate-fade-in text-center">
      <div className="flex justify-center mb-4 text-[#D67D3E]">
        <Clock size={48} />
      </div>
      <h2 className="text-xl font-bold text-[#543310] mb-2">Đang giữ bàn</h2>
      <p className="text-[#6B625B] text-sm mb-4">Vui lòng hoàn tất thanh toán cọc để xác nhận đặt bàn.</p>
      
      <div className="text-4xl font-bold text-[#D67D3E] mb-6">
        {formatTime(timeLeft)}
      </div>

      <div className="bg-[#FAF7F3] p-4 rounded-xl text-left mb-6">
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-[#6B625B]">Mã đặt bàn</span>
          <span className="font-bold text-[#222222]">{reservationCode}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#6B625B]">Số tiền cọc</span>
          <span className="font-bold text-[#543310]">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(depositAmount)}
          </span>
        </div>
      </div>

      <button 
        onClick={onProceed}
        className="w-full py-3 bg-[#543310] text-white font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-[#D67D3E] transition-colors"
      >
        <ShieldCheck size={20} />
        Thanh toán ngay
      </button>
    </div>
  );
}
