'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/ToastProvider';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showError, showInfo } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      showError('Vui lòng nhập đầy đủ thông tin đăng nhập');
      return;
    }

    // Backend MVP requires email for login
    const email = identifier.includes('@') ? identifier.trim() : `${identifier.trim()}@cafe-and-cake.test`;

    try {
      setLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const resJson = await res.json();
      const payload = resJson?.data ?? resJson;
      if (!res.ok || !payload?.access_token) {
        throw new Error(resJson?.error?.message || payload?.message || 'Email hoặc mật khẩu không chính xác');
      }

      // Store valid JWT token
      const token = payload.access_token;
      document.cookie = `jwt=${encodeURIComponent(token)}; path=/; max-age=86400`;
      localStorage.setItem('access_token', token);
      if (payload.refresh_token) {
        localStorage.setItem('refresh_token', payload.refresh_token);
      }

      showInfo('Đăng nhập thành công');
      router.push('/menu');
    } catch (err: any) {
      console.error('Login error:', err);
      showError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#FAF7F3]">
      <div className="p-8 w-full max-w-sm bg-white rounded-lg shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-[#543310] mb-6 border-b-2 border-[#D67D3E] pb-2">Đăng Nhập</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email / Số điện thoại</label>
            <input 
              type="text"
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="customer@example.com"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 bg-[#543310] text-[#FAF7F3] font-bold py-3 rounded hover:bg-opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
