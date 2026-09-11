import React, { useState } from 'react';
import { X } from 'lucide-react';
import { apiClient } from '@fnb/utils';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export function TopUpModal({ isOpen, onClose, onSuccess }: TopUpModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleTopUp = async () => {
    const num = parseInt(amount.replace(/\D/g, ''), 10);
    if (isNaN(num) || num < 10000) {
      setError('Số tiền nạp tối thiểu là 10.000đ');
      return;
    }

    try {
      setLoading(true);
      setError('');
      // POST /api/v1/wallet/topup
      const res: any = await apiClient.post('/wallet/topup', { amount: num });
      onSuccess(res.new_balance || num);
      onClose();
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống khi nạp tiền');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Just allow numbers
    const val = e.target.value.replace(/\D/g, '');
    if (val) {
      // Format as VN currency
      const formatted = new Intl.NumberFormat('vi-VN').format(parseInt(val, 10));
      setAmount(formatted);
    } else {
      setAmount('');
    }
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#E8DED5] flex justify-between items-center bg-[#FAF7F3]">
          <h2 className="font-bold text-[#543310]">Nạp tiền vào ví</h2>
          <button onClick={onClose} className="p-1 text-[#6B625B] hover:text-[#B42318] transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <label className="block text-sm font-bold text-[#222222] mb-2">Số tiền muốn nạp (VNĐ)</label>
          <input
            type="text"
            value={amount}
            onChange={handleAmountChange}
            placeholder="Ví dụ: 100.000"
            className="w-full text-center text-2xl font-bold font-serif text-[#543310] p-4 bg-[#FAF7F3] border border-[#E8DED5] rounded-xl focus:outline-none focus:border-[#D67D3E] focus:ring-1 focus:ring-[#D67D3E] transition-all"
          />
          {error && <p className="text-[#B42318] text-xs mt-2 text-center">{error}</p>}

          <div className="flex gap-2 mt-4">
            {[50000, 100000, 200000].map(val => (
              <button
                key={val}
                onClick={() => setAmount(new Intl.NumberFormat('vi-VN').format(val))}
                className="flex-1 py-2 text-sm font-bold text-[#6B625B] bg-[#FAF7F3] border border-[#E8DED5] rounded-lg hover:bg-[#FED8B1]/30 hover:border-[#D67D3E] hover:text-[#D67D3E] transition-all"
              >
                {new Intl.NumberFormat('vi-VN').format(val)}
              </button>
            ))}
          </div>

          <button
            onClick={handleTopUp}
            disabled={loading || !amount}
            className="w-full mt-6 py-4 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#D67D3E] disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận nạp tiền'}
          </button>
        </div>
      </div>
    </div>
  );
}
