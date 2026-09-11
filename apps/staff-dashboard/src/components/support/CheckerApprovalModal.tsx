import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';

interface CheckerApprovalModalProps {
  transactionId: string;
  makerId: string;
  proposedCustomerName?: string;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
}

export function CheckerApprovalModal({ transactionId: _, makerId, proposedCustomerName, onApprove, onReject }: CheckerApprovalModalProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSelfApproval = currentUser?.id === makerId;

  const handleAction = async (action: 'approve' | 'reject') => {
    setLoading(true);
    setError('');
    try {
      if (action === 'approve') await onApprove();
      else await onReject();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mt-6">
      <h3 className="font-bold text-[#543310] mb-4 border-b border-gray-100 pb-2">Duyệt đề xuất ghép (Checker)</h3>
      
      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4">
        <p className="text-gray-700">
          Tài khoản Maker <strong>{makerId}</strong> đã đề xuất khớp giao dịch này với khách hàng <strong>{proposedCustomerName || 'Không xác định'}</strong>.
        </p>
      </div>

      {isSelfApproval ? (
        <div className="p-3 bg-red-50 text-[var(--color-brand-error)] text-sm rounded-xl font-medium border border-red-100 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span><strong>ERR_6002_SELF_APPROVAL:</strong> Bạn không thể tự duyệt đề xuất do chính mình tạo ra theo quy tắc Maker-Checker. Vui lòng nhờ một nhân sự khác hoặc cấp trên duyệt.</span>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-4">Vui lòng kiểm tra lại thông tin trước khi duyệt. Hành động này không thể hoàn tác.</p>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-[var(--color-brand-error)] text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={() => handleAction('reject')}
          disabled={loading || isSelfApproval}
          className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 hover:text-[var(--color-brand-error)] hover:border-[var(--color-brand-error)] transition disabled:opacity-50 flex items-center gap-2"
        >
          <XCircle size={18} />
          Từ chối (Trả về Pending)
        </button>
        <button
          onClick={() => handleAction('approve')}
          disabled={loading || isSelfApproval}
          className="px-6 py-2.5 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#3d250c] transition disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? 'Đang xử lý...' : <><CheckCircle2 size={18} /> Duyệt đề xuất</>}
        </button>
      </div>
    </div>
  );
}
