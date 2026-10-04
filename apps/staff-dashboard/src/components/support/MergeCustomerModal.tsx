import React, { useState } from 'react';
import { Merge, AlertTriangle, X } from 'lucide-react';
import { apiClient } from '@fnb/utils';

interface MergeCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MergeCustomerModal({ isOpen, onClose }: MergeCustomerModalProps) {
  const [sourcePhone, setSourcePhone] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcePhone.trim() || !targetPhone.trim()) {
      setError('Vui lòng nhập đầy đủ SĐT hoặc mã khách hàng');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let sourceId = sourcePhone.trim();
      let targetId = targetPhone.trim();

      // If phones were provided instead of UUIDs, look them up via CDP
      if (!sourceId.includes('-') || !targetId.includes('-')) {
        const cRes: any = await apiClient.get('/cdp/customers?segment=ALL');
        const cList = cRes.data?.data || cRes.data || (Array.isArray(cRes) ? cRes : []);
        if (!sourceId.includes('-')) {
          const found = cList.find((c: any) => c.phone === sourceId);
          if (found) sourceId = found.id;
          else throw new Error(`Không tìm thấy khách hàng với SĐT nguồn: ${sourceId}`);
        }
        if (!targetId.includes('-')) {
          const found = cList.find((c: any) => c.phone === targetId);
          if (found) targetId = found.id;
          else throw new Error(`Không tìm thấy khách hàng với SĐT đích: ${targetId}`);
        }
      }

      await apiClient.post('/support/customers/merge', {
        source_customer_id: sourceId,
        target_customer_id: targetId,
      });

      setSuccess('Đã hợp nhất tài khoản khách hàng thành công!');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi hợp nhất');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl border-t-4 border-[#B42318]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-red-50/50">
          <div className="flex items-center gap-2 text-[#B42318]">
            <Merge size={20} />
            <h2 className="font-bold text-lg">Hợp nhất Tài khoản Khách</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-[var(--color-brand-error)] transition-colors disabled:opacity-50" disabled={loading}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 p-3 rounded-xl border border-red-100">
            <p className="text-sm text-red-800 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span><strong>CẢNH BÁO NGUY HIỂM:</strong> Hành động này sẽ gộp Điểm tích luỹ, Số dư Ví và Lịch sử đơn hàng của SĐT Nguồn vào SĐT Đích. Tài khoản nguồn sẽ bị Vô hiệu hóa vĩnh viễn.</span>
            </p>
          </div>

          {success && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-xl font-medium border border-green-100">
              {success}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-[var(--color-brand-error)] text-sm rounded-xl font-medium border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">SĐT Nguồn (Sẽ bị xoá) *</label>
            <input
              type="tel"
              value={sourcePhone}
              onChange={(e) => setSourcePhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#B42318] focus:border-transparent outline-none transition-all"
              placeholder="Nhập SĐT..."
              disabled={loading || !!success}
            />
          </div>

          <div className="flex justify-center my-2 text-gray-400">
            <Merge size={20} className="rotate-90" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">SĐT Đích (Sẽ giữ lại) *</label>
            <input
              type="tel"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#B42318] focus:border-transparent outline-none transition-all"
              placeholder="Nhập SĐT..."
              disabled={loading || !!success}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 mt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || !!success}
              className="px-5 py-2.5 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !!success}
              className="px-5 py-2.5 bg-[#B42318] text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Đang gộp...' : 'Tiến hành Hợp nhất'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
