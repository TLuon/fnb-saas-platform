import React, { useState } from 'react';
import { KeyRound, Copy, Check, X, RefreshCw, Eye, EyeOff } from 'lucide-react';
import type { StaffMember } from '../../store/staffStore';

interface ResetStaffPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember | null;
  onConfirmReset: (id: string, customPassword?: string) => Promise<{ new_password?: string }>;
}

export function ResetStaffPasswordModal({
  isOpen,
  onClose,
  staff,
  onConfirmReset,
}: ResetStaffPasswordModalProps) {
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resultPassword, setResultPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !staff) return null;

  const handleGenerateRandom = () => {
    const randomPass = Math.random().toString(36).slice(-8) + 'A1!';
    setCustomPassword(randomPass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await onConfirmReset(staff.id, customPassword || undefined);
      setResultPassword(res?.new_password || customPassword || '123456');
    } catch (err: any) {
      setError(err?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (resultPassword) {
      navigator.clipboard.writeText(resultPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setCustomPassword('');
    setResultPassword(null);
    setCopied(false);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--color-brand-primary)] text-white p-6 relative">
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
          >
            <X size={18} />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
            <KeyRound size={24} className="text-white" />
          </div>
          <h3 className="text-xl font-bold font-serif">Đặt lại Mật khẩu</h3>
          <p className="text-white/80 text-xs mt-1">
            Nhân viên: <span className="font-bold text-white">{staff.name}</span> {staff.phone ? `(${staff.phone})` : ''}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          {resultPassword ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-2">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                  Đã đặt lại mật khẩu thành công!
                </p>
                <div className="flex items-center justify-center gap-2 bg-white px-4 py-3 rounded-xl border border-emerald-200 shadow-inner">
                  <span className="font-mono font-bold text-lg text-[var(--color-brand-primary)] tracking-wider">
                    {resultPassword}
                  </span>
                </div>
                <p className="text-xs text-emerald-600">
                  Hãy gửi mật khẩu mới này cho nhân viên <span className="font-bold">{staff.name}</span>.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 py-3 bg-[var(--color-brand-primary)] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-brand-secondary)] transition shadow-md"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép mật khẩu'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Mật khẩu mới (Tùy chọn)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Bỏ trống để tự động sinh ngẫu nhiên"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm pr-10 focus:outline-none focus:border-[var(--color-brand-secondary)]"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleGenerateRandom}
                  className="text-xs text-[var(--color-brand-secondary)] font-bold flex items-center gap-1 hover:underline"
                >
                  <RefreshCw size={14} />
                  <span>Tạo mật khẩu ngẫu nhiên</span>
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-[var(--color-brand-primary)] text-white rounded-xl font-bold hover:bg-[var(--color-brand-secondary)] transition shadow-md disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : 'Xác nhận Đặt lại'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
