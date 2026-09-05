'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/ToastProvider';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { showError, showInfo } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      showError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    
    // Mock login success - giả lập API và gán cookie cho middleware đi qua
    const payload = btoa(JSON.stringify({ role_app: 'CUSTOMER', exp: Math.floor(Date.now() / 1000) + 86400 })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    document.cookie = `jwt=header.${payload}.signature; path=/`;
    showInfo('Đăng nhập thành công');
    router.push('/floors/1');
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#FAF7F3]">
      <div className="p-8 w-full max-w-sm bg-white rounded-lg shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-[#543310] mb-6 border-b-2 border-[#D67D3E] pb-2">Đăng Nhập</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input 
              type="tel" 
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="09..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu / OTP</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            className="w-full mt-4 bg-[#543310] text-[#FAF7F3] font-bold py-3 rounded hover:bg-opacity-90 transition"
          >
            Đăng Nhập
          </button>
        </form>
      </div>
    </div>
  );
}
