import React from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export type PaymentStatus = 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAIL';

interface PaymentStatusBannerProps {
  status: PaymentStatus;
}

export function PaymentStatusBanner({ status }: PaymentStatusBannerProps) {
  if (status === 'IDLE') return null;

  const config = {
    PENDING: {
      bg: 'bg-[#FED8B1]',
      text: 'text-[#D67D3E]',
      border: 'border-[#D67D3E]',
      icon: <Loader2 size={24} className="animate-spin" />,
      title: 'Đang xử lý thanh toán...'
    },
    SUCCESS: {
      bg: 'bg-[#E2F3E5]', // #237A57 nhạt
      text: 'text-[#237A57]',
      border: 'border-[#8AD199]',
      icon: <CheckCircle size={24} />,
      title: 'Thanh toán thành công!'
    },
    FAIL: {
      bg: 'bg-[#FEE4E2]', // #B42318 nhạt
      text: 'text-[#B42318]',
      border: 'border-[#FDA29B]',
      icon: <XCircle size={24} />,
      title: 'Thanh toán thất bại'
    }
  };

  const curr = config[status];

  return (
    <div className={`${curr.bg} ${curr.text} ${curr.border} border p-4 rounded-xl flex items-center justify-center gap-3 font-bold mb-4 shadow-sm animate-fade-in`}>
      {curr.icon}
      <span>{curr.title}</span>
    </div>
  );
}
