import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
}

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, title, message }: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError('');
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Xóa thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[var(--color-brand-neutral)]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-[var(--color-brand-error)]" />
            <h2 className="font-bold text-[var(--color-brand-error)] text-lg">
              {title}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-[var(--color-brand-error)] transition-colors disabled:opacity-50" disabled={loading}>
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 mb-6">{message}</p>

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
              disabled={loading}
              className="px-5 py-2.5 bg-[var(--color-brand-error)] text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Đang xóa...' : 'Xóa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
