'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/ToastProvider';
import { apiClient } from '@fnb/utils';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showError, showInfo } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPassword) {
      showError('Vui lòng nhập đầy đủ mã xác thực và mật khẩu mới');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      });

      showInfo('Đặt lại mật khẩu thành công!');
      router.replace('/login');
    } catch (err: any) {
      console.error('Reset password error:', err);
      showError(err?.message || 'Không thể đặt lại mật khẩu. Mã xác thực có thể đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#FAF7F3]">
      <div className="p-8 w-full max-w-sm bg-[#FFFFFF] rounded-lg shadow-sm border border-[#E8DED5]">
        <h1 className="text-2xl font-bold text-[#543310] mb-4 border-b-2 border-[#D67D3E] pb-2 text-center">Đặt Lại Mật Khẩu</h1>

        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1">Mã xác thực (Token / OTP)</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-[#E8DED5] rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Nhập mã xác thực từ email"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1">Mật khẩu mới</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-[#E8DED5] rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-[#E8DED5] rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#543310] text-[#FFFFFF] font-bold py-3 rounded hover:bg-[#D67D3E] transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}
