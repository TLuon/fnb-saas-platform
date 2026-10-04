import React, { useState } from 'react';
import { CheckSquare, X } from 'lucide-react';

interface ResolveTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
  ticketId: string;
}

export function ResolveTicketModal({ isOpen, onClose, onSubmit, ticketId }: ResolveTicketModalProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError('Vui lòng nhập ghi chú giải quyết');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit(note.trim());
      setNote('');
      onClose();
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
            <CheckSquare size={20} />
            <h2 className="font-bold text-lg">Đóng Ticket {ticketId}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-[var(--color-brand-error)] transition-colors disabled:opacity-50" disabled={loading}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-gray-600 mb-2">
            Vui lòng ghi lại cách giải quyết và thỏa thuận với khách hàng trước khi đóng Ticket này.
          </p>

          {error && (
            <div className="p-3 bg-red-50 text-[var(--color-brand-error)] text-sm rounded-xl font-medium border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Ghi chú giải quyết *</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:border-transparent outline-none transition-all resize-none h-32"
              placeholder="VD: Đã gọi điện xin lỗi và tặng voucher 50K..."
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[var(--color-brand-primary)] text-white font-bold rounded-xl hover:bg-[#3d250c] transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Xác nhận Đóng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
