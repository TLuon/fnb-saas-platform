import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Category } from '../../store/menuStore';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string }) => Promise<void>;
  initialData?: Category | null;
}

export function CategoryFormModal({ isOpen, onClose, onSubmit, initialData }: CategoryFormModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
      } else {
        setName('');
      }
      setError('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit({ name: name.trim() });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[var(--color-brand-neutral)]">
          <h2 className="font-bold text-[var(--color-brand-primary)] text-lg">
            {initialData ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-[var(--color-brand-error)] transition-colors disabled:opacity-50" disabled={loading}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-[var(--color-brand-error)] text-sm rounded-xl font-medium border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">Tên danh mục *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:border-transparent outline-none transition-all"
              placeholder="VD: Cà phê Việt Nam"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-6">
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
              className="px-5 py-2.5 bg-[var(--color-brand-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-brand-secondary)] transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu lại'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
