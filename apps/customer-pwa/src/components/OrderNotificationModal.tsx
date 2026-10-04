'use client';

import React from 'react';
import { CheckCircle2, XCircle, Store, FileText, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface OrderNotificationModalProps {
  isOpen: boolean;
  type: 'CONFIRMED' | 'CANCELLED';
  orderCode: string;
  tableName?: string;
  reason?: string;
  onClose: () => void;
}

export function OrderNotificationModal({
  isOpen,
  type,
  orderCode,
  tableName,
  reason,
  onClose,
}: OrderNotificationModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const isConfirmed = type === 'CONFIRMED';

  const handleAction = () => {
    onClose();
    if (!isConfirmed) {
      router.push('/cart');
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
            {isConfirmed ? 'ĐÃ XÁC NHẬN ĐƠN HÀNG' : 'ĐƠN HÀNG BỊ HỦY'}
          </h3>
          <p className="text-xs text-[#6B625B] font-medium leading-relaxed max-w-xs mx-auto">
            {isConfirmed
              ? 'Nhà hàng đã xác nhận thanh toán và đang chuẩn bị món cho quý khách.'
              : 'Rất tiếc, đơn hàng của quý khách đã bị hủy bởi nhà hàng.'}
          </p>
        </div>

        {/* Content Box */}
        <div className="p-6 pt-2 space-y-4">
          <div className="bg-white border border-[#E8DED5] rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex justify-between items-center text-sm border-b border-[#FAF7F3] pb-2">
              <span className="text-[#6B625B] flex items-center gap-1.5 font-medium">
                <FileText size={16} className="text-[#D67D3E]" /> Mã đơn:
              </span>
              <span className="font-bold font-mono text-[#543310] text-base">{orderCode}</span>
            </div>

            {tableName && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#6B625B] flex items-center gap-1.5 font-medium">
                  <Store size={16} className="text-[#D67D3E]" /> Bàn:
                </span>
                <span className="font-bold text-[#543310]">{tableName}</span>
              </div>
            )}

            {isConfirmed && (
              <div className="mt-2 pt-2 border-t border-[#E8DED5]">
                <p className="text-xs text-[#237A57] font-medium text-center italic">
                  * Vui lòng chờ trong ít phút, nhà hàng sẽ phục vụ món ngay.
                </p>
              </div>
            )}

            {!isConfirmed && (
              <div className="mt-2 pt-2 border-t border-[#FECDCA]">
                <div className="text-xs font-bold text-[#B42318] uppercase tracking-wider mb-1">
                  Lý do từ nhà hàng:
                </div>
                <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#912018] text-xs p-3 rounded-xl font-medium leading-relaxed">
                  {reason || 'Hủy do sự cố kỹ thuật hoặc quá thời gian xác nhận.'}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleAction}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
              isConfirmed 
                ? 'bg-[#543310] hover:bg-[#3D250C] shadow-[#543310]/20' 
                : 'bg-[#B42318] hover:bg-[#912018] shadow-[#B42318]/20'
            }`}
          >
            {isConfirmed ? 'Đã hiểu' : 'Quay lại'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
