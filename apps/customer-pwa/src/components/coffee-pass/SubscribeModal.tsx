import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { PassPlan } from './PassPlanCard';

interface SubscribeModalProps {
  plan: PassPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (planId: string) => Promise<void>;
  walletBalance: number;
}

export function SubscribeModal({ plan, isOpen, onClose, onConfirm, walletBalance }: SubscribeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !plan) return null;

  const canAfford = walletBalance >= plan.price;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError('');
      await onConfirm(plan.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi mua gói.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#E8DED5] flex justify-between items-center bg-[#FAF7F3]">
          <h2 className="font-bold text-[#543310]">Xác nhận mua gói</h2>
          <button onClick={onClose} className="p-1 text-[#6B625B] hover:text-[#B42318] transition-colors disabled:opacity-50" disabled={loading}>
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-[#222222] mb-1">{plan.name}</h3>
            <p className="text-sm text-[#6B625B]">Số lượt: {plan.total_redemptions} ly - HSD: {plan.duration_days} ngày</p>
          </div>

          <div className="bg-[#FAF7F3] p-4 rounded-xl border border-[#E8DED5] space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-[#6B625B]">Giá gói</span>
              <span className="font-bold text-[#222222]">{formatPrice(plan.price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6B625B]">Số dư ví FNB</span>
              <span className="font-bold text-[#237A57]">{formatPrice(walletBalance)}</span>
            </div>
            
            <div className="pt-3 border-t border-[#E8DED5] flex justify-between">
              <span className="font-bold text-[#543310]">Thanh toán</span>
              <span className="font-bold text-[#B42318]">{formatPrice(plan.price)}</span>
            </div>
          </div>

          {!canAfford && (
            <div className="mb-4 p-3 bg-[#FEE4E2] text-[#B42318] rounded-lg text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-none" />
              <span>Số dư ví của bạn không đủ để mua gói này. Vui lòng nạp thêm tiền.</span>
            </div>
          )}

          {error && (
            <div className="mb-4 text-[#B42318] text-sm text-center font-bold">
              {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={loading || !canAfford}
            className="w-full py-4 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#D67D3E] transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
          </button>
        </div>
      </div>
    </div>
  );
}
