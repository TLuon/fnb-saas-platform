'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/ToastProvider';
import { apiClient } from '@fnb/utils';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();
  const { showError, showInfo } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showError('Vui lòng nhập địa chỉ email');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/auth/forgot-password', { email });
      setSubmitted(true);
      showInfo('Yêu cầu đã được gửi!');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      showError(err?.message || 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#FAF7F3]">
      <div className="p-8 w-full max-w-sm bg-[#FFFFFF] rounded-lg shadow-sm border border-[#E8DED5]">
        <h1 className="text-2xl font-bold text-[#543310] mb-4 border-b-2 border-[#D67D3E] pb-2 text-center">Quên Mật Khẩu</h1>

        {submitted ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-100 text-[#237A57] rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">
              ✓
            </div>
            <h3 className="font-bold text-[#543310] mb-2">Đã gửi hướng dẫn!</h3>
            <p className="text-xs text-[#6B625B] mb-6">
              Chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu tới <span className="font-bold text-[#543310]">{email}</span>. Vui lòng kiểm tra hòm thư của bạn.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-[#543310] text-white font-bold py-2.5 rounded hover:bg-[#D67D3E] transition-colors text-sm"
            >
              Quay lại Đăng nhập
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-xs text-[#6B625B] mb-2">
              Nhập email tài khoản của bạn. Chúng tôi sẽ gửi thông tin để bạn tạo lại mật khẩu mới.
            </p>

            <div>
              <label className="block text-sm font-medium text-[#222222] mb-1">Email đăng ký</label>
              <input
                type="email"
                className="w-full px-4 py-2 border border-[#E8DED5] rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#543310] text-[#FFFFFF] font-bold py-3 rounded hover:bg-[#D67D3E] transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang gửi...' : 'Gửi yêu cầu đặt lại mật khẩu'}
            </button>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-xs text-[#D67D3E] font-medium hover:underline"
              >
                Quay lại Đăng nhập
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
