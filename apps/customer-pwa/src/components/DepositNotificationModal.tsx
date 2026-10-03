'use client';

import React from 'react';
import { CheckCircle2, XCircle, Store, FileText, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface DepositNotificationModalProps {
  isOpen: boolean;
  type: 'CONFIRMED' | 'CANCELLED';
  reservationCode: string;
  tableName?: string;
  reason?: string;
  onClose: () => void;
}

export function DepositNotificationModal({
  isOpen,
  type,
  reservationCode,
  tableName,
  reason,
  onClose,
}: DepositNotificationModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const isConfirmed = type === 'CONFIRMED';

  const handleAction = () => {
    onClose();
    if (!isConfirmed) {
      router.push('/floors');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF7F3] rounded-3xl shadow-2xl border border-[#FED8B1] max-w-md w-full overflow-hidden relative transition-all transform scale-100">
        
        {/* Top Header Background Accent */}
        <div className={`p-6 text-center ${isConfirmed ? 'bg-gradient-to-b from-[#E2F3E5] to-[#FAF7F3]' : 'bg-gradient-to-b from-[#FEE4E2] to-[#FAF7F3]'}`}>
          <div className="flex justify-center mb-3">
            {isConfirmed ? (
              <div className="w-16 h-16 bg-[#237A57]/15 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-[#237A57]" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-[#B42318]/15 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-[#B42318]" />
              </div>
            )}
          </div>

          <h3 className={`text-xl font-black uppercase tracking-tight mb-1 ${isConfirmed ? 'text-[#237A57]' : 'text-[#B42318]'}`}>
            {isConfirmed ? 'Đã xác nhận tiền cọc' : 'Đặt bàn đã bị hủy'}
          </h3>
          <p className="text-xs text-[#6B625B] font-medium leading-relaxed max-w-xs mx-auto">
            {isConfirmed
              ? 'Cửa hàng đã xác nhận khoản đặt cọc thành công và khóa giữ bàn cho quý khách.'
              : 'Rất tiếc, yêu cầu giữ bàn của quý khách đã bị hủy bởi nhà hàng.'}
          </p>
        </div>

        {/* Content Box */}
        <div className="p-6 pt-2 space-y-4">
          <div className="bg-white border border-[#E8DED5] rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex justify-between items-center text-sm border-b border-[#FAF7F3] pb-2">
              <span className="text-[#6B625B] flex items-center gap-1.5 font-medium">
                <FileText size={16} className="text-[#D67D3E]" /> Mã đặt bàn:
              </span>
              <span className="font-bold font-mono text-[#543310] text-base">{reservationCode}</span>
            </div>

            {tableName && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#6B625B] flex items-center gap-1.5 font-medium">
                  <Store size={16} className="text-[#D67D3E]" /> Bàn giữ:
                </span>
                <span className="font-bold text-[#543310]">{tableName}</span>
              </div>
            )}

            {!isConfirmed && (
              <div className="mt-2 pt-2 border-t border-[#FECDCA]">
                <div className="text-xs font-bold text-[#B42318] uppercase tracking-wider mb-1">
                  Lý do từ nhà hàng:
                </div>
                <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#912018] text-xs p-3 rounded-xl font-medium leading-relaxed">
                  {reason || 'Nhà hàng không nhận được khoản cọc hoặc quá thời gian giữ bàn.'}
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleAction}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-white text-base shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] ${
              isConfirmed
                ? 'bg-[#543310] hover:bg-[#D67D3E] shadow-[#543310]/20'
                : 'bg-[#B42318] hover:bg-red-700 shadow-red-600/20'
            }`}
          >
            <span>{isConfirmed ? 'Đã hiểu' : 'Đồng ý & Chọn bàn khác'}</span>
            <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
