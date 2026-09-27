import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authStore, apiClient } from '@fnb/utils';
import { Coffee, Clock, User, X, Plus } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setError('');
    setLoading(true);
    authStore.getState().clearAuth();

    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const tokens = res.data?.data || res.data || res;
      
      authStore.getState().setTokens(tokens.access_token, tokens.refresh_token);

      const meRes = await apiClient.get('/auth/me');
      const meData = meRes.data?.data || meRes.data || meRes;
      const profileInfo = meData.profile || {};

      if (!['OWNER', 'STAFF', 'SUPPORT'].includes(meData.role_app)) {
        throw new Error('Tài khoản không có quyền truy cập Staff Dashboard');
      }
      
      if (profileInfo.is_active === false) {
        authStore.getState().clearAuth();
        setError('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản lý!');
        return;
      }

      authStore.getState().setProfile({
        id: profileInfo.id || meData.sub || 'unknown',
        auth_user_id: meData.sub,
        role_app: meData.role_app,
        email: email,
        full_name: profileInfo.full_name || 'Nhân viên',
        phone: profileInfo.phone,
        is_active: profileInfo.is_active !== false,
        branch_id: meData.branch_id,
        tenant_id: meData.tenant_id,
      });
      
      const role = meData.role_app || authStore.getState().role;
      const lowerEmail = email.toLowerCase();
      
      if (role === 'SUPPORT') {
        navigate('/support/board');
      } else if (role === 'STAFF') {
        if (lowerEmail.includes('bep')) {
          navigate('/kds/kitchen');
        } else if (lowerEmail.includes('bar')) {
          navigate('/kds/bar');
        } else {
          navigate('/pos');
        }
      } else {
        navigate('/analytics');
      }

    } catch (err: any) {
      authStore.getState().clearAuth();
      const serverMsg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || '';
      if (
        err?.code === 'ERR_1001_UNAUTHORIZED' ||
        serverMsg.includes('vô hiệu hóa') ||
        err?.message?.includes('vô hiệu hóa')
      ) {
        setError('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản lý!');
      } else {
        setError(serverMsg || 'Lỗi kết nối máy chủ');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-brand-neutral)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--color-brand-primary)] text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Coffee size={32} />
          </div>
          <h1 className="text-3xl font-black font-serif text-[var(--color-brand-primary)]">
            F&B SaaS
          </h1>
          <p className="text-gray-500 text-sm mt-1">Đăng nhập cổng quản trị & vận hành quán</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm">
            <X size={20} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Email đăng nhập
            </label>
            <div className="flex items-center bg-[var(--color-brand-neutral)] px-4 py-3 rounded-xl border border-gray-200 focus-within:border-[var(--color-brand-secondary)] transition">
              <User size={18} className="text-gray-400 mr-2 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@fnb.local"
                className="bg-transparent w-full outline-none text-sm text-[var(--color-brand-primary)] font-medium"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Mật khẩu
            </label>
            <div className="flex items-center bg-[var(--color-brand-neutral)] px-4 py-3 rounded-xl border border-gray-200 focus-within:border-[var(--color-brand-secondary)] transition">
              <Clock size={18} className="text-gray-400 mr-2 shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent w-full outline-none text-sm text-[var(--color-brand-primary)] font-medium"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            <div className="text-right mt-1.5">
              <button
                type="button"
                onClick={() => {
                  setError('Vui lòng liên hệ Quản lý (Owner) để được cấp lại mật khẩu.');
                }}
                className="text-xs text-[var(--color-brand-secondary)] font-medium hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[var(--color-brand-primary)] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-brand-secondary)] hover:shadow-lg transition-all duration-300 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập hệ thống</span>
                <Plus size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          Hệ thống bảo mật đa chi nhánh với Supabase Auth & JWT Claims
        </div>
      </div>
    </div>
  );
}
