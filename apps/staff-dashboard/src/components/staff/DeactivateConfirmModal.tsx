import { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import type { StaffMember } from '../../store/staffStore';

interface DeactivateConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  staff: StaffMember | null;
  totalActiveOwners: number;
}

export function DeactivateConfirmModal({ isOpen, onClose, onConfirm, staff, totalActiveOwners }: DeactivateConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !staff) return null;

  // Rule: Cannot deactivate the last OWNER
  const isLastOwner = staff.role === 'OWNER' && staff.active && totalActiveOwners <= 1;

  const handleConfirm = async () => {
    if (isLastOwner) return;

    try {
      setLoading(true);
      setError('');
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Vô hiệu hóa thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[var(--color-brand-neutral)]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-[var(--color-brand-error)]" />
            <h2 className="font-bold text-[var(--color-brand-error)] text-lg">
              Vô hiệu hóa tài khoản
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-[var(--color-brand-error)] transition-colors disabled:opacity-50" disabled={loading}>
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 mb-2">
            Bạn có chắc chắn muốn vô hiệu hóa tài khoản của <strong className="text-[var(--color-brand-primary)]">{staff.name}</strong> không?
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Nhân viên này sẽ ngay lập tức bị đăng xuất và không thể đăng nhập vào hệ thống được nữa.
          </p>

          {isLastOwner && (
            <div className="mb-4 p-3 bg-red-50 text-[var(--color-brand-error)] text-sm rounded-xl font-medium border border-red-100">
              Không thể vô hiệu hóa tài khoản này. Đây là tài khoản Chủ quán (OWNER) duy nhất còn hoạt động trong hệ thống!
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-[var(--color-brand-error)] text-sm rounded-xl font-medium border border-red-100">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || isLastOwner}
              className={`px-5 py-2.5 font-bold rounded-xl shadow-sm transition-colors ${
                isLastOwner 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-[var(--color-brand-error)] text-white hover:bg-red-700'
              }`}
            >
              {loading ? 'Đang xử lý...' : 'Vô hiệu hóa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
