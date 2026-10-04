'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Coffee, LogOut, Mail, Phone, ReceiptText, Star, Ticket, Wallet } from 'lucide-react';
import { useStore } from 'zustand';
import { apiClient, authStore } from '@fnb/utils';
import { PublicHeader } from '../../components/PublicHeader';

const tierLabels: Record<string, string> = {
  STANDARD: 'Tiêu chuẩn',
  BRONZE: 'Đồng',
  SILVER: 'Bạc',
  GOLD: 'Vàng',
  PLATINUM: 'Bạch kim',
};

export default function ProfilePage() {
  const router = useRouter();
  const profile = useStore(authStore, (state) => state.profile);
  const isAuthenticated = useStore(authStore, (state) => state.isAuthenticated);
  const [loading, setLoading] = useState(!profile);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || profile) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const payload: any = await apiClient.get('/auth/me');
        authStore.getState().setProfile({
          id: payload.profile?.id || payload.sub,
          auth_user_id: payload.sub,
          role_app: payload.role_app,
          email: payload.profile?.email || payload.email,
          phone: payload.profile?.phone,
          full_name: payload.profile?.full_name || 'Khách hàng',
          tenant_id: payload.tenant_id,
          membership_tier: payload.profile?.membership_tier,
          loyalty_points: Number(payload.profile?.loyalty_points || 0),
        });
      } catch (err: any) {
        setError(err?.message || 'Không thể tải hồ sơ khách hàng.');
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
  }, [isAuthenticated, profile]);

  const handleLogout = () => {
    authStore.getState().clearAuth();
    router.push('/');
  };

  const initials = (profile?.full_name || 'K')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <main className="min-h-screen bg-[#FAF7F3] pb-12">
      <PublicHeader />

      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="border-b border-[#E8DED5] pb-6">
          <p className="mb-2 text-sm font-bold text-[#D67D3E]">Tài khoản khách hàng</p>
          <h1 className="font-serif text-3xl font-bold text-[#543310]">Hồ sơ của tôi</h1>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#6B625B]">Đang tải hồ sơ...</div>
        ) : error ? (
          <div className="my-6 border border-[#FDA29B] bg-[#FEE4E2] p-4 text-[#B42318]">{error}</div>
        ) : (
          <>
            <section className="flex flex-col gap-5 border-b border-[#E8DED5] py-7 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#543310] font-serif text-2xl font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-2xl font-bold text-[#222222]">{profile?.full_name || 'Khách hàng'}</h2>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#6B625B]">
                  <span className="flex items-center gap-2"><Mail size={16} />{profile?.email || 'Chưa cập nhật email'}</span>
                  <span className="flex items-center gap-2"><Phone size={16} />{profile?.phone || 'Chưa cập nhật số điện thoại'}</span>
                </div>
              </div>
              <div className="border-l-0 border-[#E8DED5] sm:border-l sm:pl-6">
                <p className="text-xs font-bold uppercase text-[#6B625B]">Hạng thành viên</p>
                <p className="mt-1 font-bold text-[#D67D3E]">{tierLabels[profile?.membership_tier || ''] || profile?.membership_tier || 'Thành viên'}</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-[#543310]"><Star size={15} />{profile?.loyalty_points ?? 0} điểm</p>
              </div>
            </section>

            <section className="py-7">
              <h2 className="mb-4 text-lg font-bold text-[#543310]">Tiện ích tài khoản</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ProfileLink href="/orders" icon={<ReceiptText size={20} />} label="Đơn hàng của tôi" />
                <ProfileLink href="/wallet" icon={<Wallet size={20} />} label="Ví F&B" />
                <ProfileLink href="/coffee-pass" icon={<Coffee size={20} />} label="Coffee Pass" />
                <ProfileLink href="/vouchers" icon={<Ticket size={20} />} label="Voucher của tôi" />
              </div>
            </section>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 border border-[#B42318] py-3 font-bold text-[#B42318] transition-colors hover:bg-[#FEE4E2]"
            >
              <LogOut size={18} />
              Đăng xuất
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function ProfileLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border border-[#E8DED5] bg-white p-4 font-bold text-[#543310] transition-colors hover:border-[#D67D3E] hover:text-[#D67D3E]"
    >
      {icon}
      {label}
    </Link>
  );
}
