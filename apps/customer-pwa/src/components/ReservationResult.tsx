import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export type ReservationResultStatus = 'SUCCESS' | 'FAIL' | 'EXPIRED';

interface ReservationResultProps {
  status: ReservationResultStatus;
  reservationCode: string;
}

export function ReservationResult({ status, reservationCode }: ReservationResultProps) {
  const router = useRouter();

  const getStatusConfig = () => {
    switch (status) {
      case 'SUCCESS':
        return {
          icon: <CheckCircle size={64} className="text-[#237A57]" />,
          title: 'Đặt bàn thành công',
          desc: 'Quán đã ghi nhận cọc và khóa bàn cho bạn.',
          bg: 'bg-[#E2F3E5]',
          border: 'border-[#8AD199]',
          titleColor: 'text-[#237A57]'
        };
      case 'FAIL':
        return {
          icon: <XCircle size={64} className="text-[#B42318]" />,
          title: 'Thanh toán thất bại',
          desc: 'Có lỗi xảy ra trong quá trình thanh toán cọc.',
          bg: 'bg-[#FEE4E2]',
          border: 'border-[#FDA29B]',
          titleColor: 'text-[#B42318]'
        };
      case 'EXPIRED':
        return {
          icon: <Clock size={64} className="text-[#6B625B]" />,
          title: 'Hết thời gian giữ bàn',
          desc: 'Phiên giữ bàn của bạn đã hết hạn do chưa hoàn tất thanh toán.',
          bg: 'bg-[#FAF7F3]',
          border: 'border-[#E8DED5]',
          titleColor: 'text-[#543310]'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`border-2 ${config.border} ${config.bg} rounded-2xl p-8 max-w-sm w-full mx-auto text-center shadow-sm animate-fade-in`}>
      <div className="flex justify-center mb-6">
        {config.icon}
      </div>
      <h2 className={`text-2xl font-bold mb-2 ${config.titleColor}`}>{config.title}</h2>
      <p className="text-[#6B625B] mb-6">{config.desc}</p>
      
      <div className="bg-white/60 p-3 rounded-lg inline-block mb-8">
        <span className="text-sm text-[#6B625B] mr-2">Mã đặt bàn:</span>
        <span className="font-bold text-[#222222]">{reservationCode}</span>
      </div>

      <div className="space-y-3">
        {status === 'SUCCESS' ? (
          <button 
            onClick={() => router.push('/menu')}
            className="w-full py-3 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#D67D3E] transition-colors"
          >
            Đến trang Menu chọn món
          </button>
        ) : (
          <button 
            onClick={() => router.push('/floors')}
            className="w-full py-3 bg-[#FFFFFF] text-[#543310] border border-[#543310] font-bold rounded-xl hover:bg-[#FAF7F3] transition-colors"
          >
            Quay lại chọn bàn khác
          </button>
        )}
      </div>
    </div>
  );
}
