'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/ToastProvider';
import { authStore, apiClient } from '@fnb/utils';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showError, showInfo } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      showError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      setLoading(true);
      
      // Call register API via shared apiClient
      await apiClient.post('/auth/register', formData);
      showInfo('Đăng ký thành công! Đang tự động đăng nhập...');

      // Auto login after registration
      const payload: any = await apiClient.post('/auth/login', { 
        email: formData.email, 
        password: formData.password 
      });

      if (payload?.access_token) {
        authStore.getState().setTokens(payload.access_token, payload.refresh_token);
        router.push('/menu');
      } else {
        router.push('/login');
      }
    } catch (err: any) {
      console.error('Register error:', err);
      showError(err.message || 'Có lỗi xảy ra. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF7F3] p-4">
      <div className="p-8 w-full max-w-sm bg-[#FFFFFF] rounded-lg shadow-sm border border-[#E8DED5]">
        <h1 className="text-2xl font-bold text-[#543310] mb-6 border-b-2 border-[#D67D3E] pb-2 text-center">Đăng Ký</h1>
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1">Họ và Tên</label>
            <input 
              type="text"
              name="name"
              className="w-full px-4 py-2 border border-[#E8DED5] rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1">Số điện thoại</label>
            <input 
              type="tel"
              name="phone"
              className="w-full px-4 py-2 border border-[#E8DED5] rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0987654321"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1">Email</label>
            <input 
              type="email"
              name="email"
              className="w-full px-4 py-2 border border-[#E8DED5] rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
              value={formData.email}
              onChange={handleChange}
              placeholder="customer@example.com"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1">Mật khẩu</label>
            <input 
              type="password" 
              name="password"
              className="w-full px-4 py-2 border border-[#E8DED5] rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 bg-[#543310] text-[#FFFFFF] font-bold py-3 rounded hover:bg-[#D67D3E] transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Đăng Ký'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-[#6B625B]">
          Đã có tài khoản?{' '}
          <button 
            onClick={() => router.push('/login')}
            className="text-[#D67D3E] font-medium hover:underline"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    </div>
  );
}
