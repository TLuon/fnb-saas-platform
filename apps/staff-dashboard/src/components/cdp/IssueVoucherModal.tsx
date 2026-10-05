import React, { useState } from 'react';
import { Gift, X } from 'lucide-react';

interface IssueVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (discountPercent: number) => Promise<void>;
  customerName: string;
}

export function IssueVoucherModal({ isOpen, onClose, onSubmit, customerName }: IssueVoucherModalProps) {
  const [discountValue, setDiscountValue] = useState('');
  const [voucherType, setVoucherType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(discountValue, 10);
    
    if (isNaN(val) || val <= 0) {
      setError('Vui lòng nhập số hợp lệ lớn hơn 0');
      return;
    }

    if (voucherType === 'PERCENT' && val > 100) {
      setError('Mức giảm phần trăm không được vượt quá 100%');
      return;
    }
    
    if (voucherType === 'AMOUNT' && val <= 100) {
      setError('Mức giảm số tiền (VND) phải lớn hơn 100đ để phân biệt với phần trăm');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit(val);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setDiscountValue('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[var(--color-brand-neutral)]">
          <div className="flex items-center gap-2 text-[var(--color-brand-primary)]">
            <Gift size={20} />
            <h2 className="font-bold text-lg">Tặng Voucher Đặc Quyền</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-[var(--color-brand-error)] transition-colors disabled:opacity-50" disabled={loading}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-gray-600 mb-2">
            Phát hành thẻ quà tặng / voucher cho khách hàng <strong>{customerName}</strong>. Voucher này sẽ được đẩy trực tiếp vào App của khách.
          </p>

          {success && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl font-medium border border-green-100 flex items-center justify-center gap-2">
              <Gift size={16} /> Đã tặng voucher thành công!
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-[var(--color-brand-error)] text-sm rounded-xl font-medium border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Loại Voucher</label>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="voucherType"
                  checked={voucherType === 'PERCENT'}
                  onChange={() => setVoucherType('PERCENT')}
                  className="w-4 h-4 text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-secondary)]"
                />
                <span className="text-sm font-medium">Theo phần trăm (%)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="voucherType"
                  checked={voucherType === 'AMOUNT'}
                  onChange={() => setVoucherType('AMOUNT')}
                  className="w-4 h-4 text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-secondary)]"
                />
                <span className="text-sm font-medium">Số tiền cố định (VND)</span>
              </label>
            </div>

            <label className="block text-sm font-semibold text-gray-800 mb-1">
              {voucherType === 'PERCENT' ? 'Mức giảm (%) *' : 'Số tiền giảm (VND) *'}
            </label>
            <input
              type="number"
              min={voucherType === 'PERCENT' ? "1" : "1000"}
              max={voucherType === 'PERCENT' ? "100" : "10000000"}
              step={voucherType === 'PERCENT' ? "1" : "1000"}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:border-transparent outline-none transition-all font-bold"
              placeholder={voucherType === 'PERCENT' ? "VD: 10" : "VD: 50000"}
              disabled={loading || success}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-2">
              {voucherType === 'PERCENT' ? 'Giảm tối đa 100%' : 'Lưu ý: Mức giảm số tiền nên là số lớn (VD: 50000đ)'}
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || success}
              className="px-5 py-2.5 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="px-5 py-2.5 bg-[var(--color-brand-primary)] text-white font-bold rounded-xl hover:bg-[#3d250c] transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Đang gửi...' : <><Gift size={18} /> Tặng Voucher</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
