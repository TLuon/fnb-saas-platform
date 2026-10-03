'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/ToastProvider';
import { authStore, apiClient } from '@fnb/utils';
import { getSafeReturnUrl } from '../../lib/checkout';

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

    try {
      setLoading(true);
      const isEmail = identifier.includes('@');
      const payload: any = await apiClient.post(
        '/auth/login', 
        isEmail ? { email: identifier, password } : { phone: identifier, password }
      );

      const tokenData = payload?.data || payload;
      const accessToken = tokenData?.access_token || payload?.access_token;

      if (!accessToken) {
        throw new Error('Đăng nhập thất bại: Không nhận được token.');
      }

      // Store valid JWT token using Zustand
      authStore.getState().setTokens(accessToken, tokenData?.refresh_token || payload?.refresh_token);

      try {
        const me: any = await apiClient.get('/auth/me');
        if (me && me.role_app && me.role_app !== 'CUSTOMER') {
          throw new Error('Tài khoản này thuộc nhân viên/quản trị viên, vui lòng đăng nhập ở cổng Staff Dashboard.');
        }
        authStore.getState().setProfile({
          id: me?.profile?.id || me?.sub,
          auth_user_id: me?.sub,
          role_app: me?.role_app || 'CUSTOMER',
          email: me?.profile?.email || me?.email,
          phone: me?.profile?.phone,
          full_name: me?.profile?.full_name || 'Khách hàng',
          tenant_id: me?.tenant_id,
          membership_tier: me?.profile?.membership_tier,
          loyalty_points: Number(me?.profile?.loyalty_points || 0),
        });
      } catch (meError: any) {
        if (meError?.message?.includes('Staff Dashboard')) throw meError;
        console.warn('Could not fetch full profile, proceeding with base auth:', meError);
      }

      showInfo('Đăng nhập thành công');
      const returnUrl = typeof window !== 'undefined'
        ? getSafeReturnUrl(window.location.search)
        : '/menu';
      router.replace(returnUrl);
    } catch (err: any) {
      console.error('Login error:', err);
      authStore.getState().clearAuth();
      showError(err?.response?.data?.message || err?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#FAF7F3]">
      <div className="p-8 w-full max-w-sm bg-[#FFFFFF] rounded-lg shadow-sm border border-[#E8DED5]">
        <h1 className="text-2xl font-bold text-[#543310] mb-6 border-b-2 border-[#D67D3E] pb-2 text-center">Đăng Nhập</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1">Email / Số điện thoại</label>
            <input 
              type="text"
              className="w-full px-4 py-2 border border-[#E8DED5] rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="customer@example.com"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#222222] mb-1">Mật khẩu</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 border border-[#E8DED5] rounded focus:outline-none focus:ring-2 focus:ring-[#D67D3E]"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
            />
            <div className="flex justify-end mt-1.5">
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-xs text-[#D67D3E] font-medium hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 bg-[#543310] text-[#FFFFFF] font-bold py-3 rounded hover:bg-[#D67D3E] transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-[#6B625B]">
          Chưa có tài khoản?{' '}
          <button 
            onClick={() => router.push('/register')}
            className="text-[#D67D3E] font-medium hover:underline"
          >
            Đăng ký ngay
          </button>
        </div>
      </div>
    </div>
  );
}
