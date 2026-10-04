import { User } from 'lucide-react';
import { authStore } from '@fnb/utils';
import { useStore } from 'zustand';

export function Header() {
  const profile = useStore(authStore, state => state.profile);
  const role = useStore(authStore, state => state.role);

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-end px-8 shadow-sm">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 group relative cursor-pointer">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-[var(--color-brand-primary)]">
              {profile?.full_name || profile?.email || 'Nhân viên'}
            </p>
            <p className="text-xs text-[var(--color-brand-secondary)] font-medium">
              {role || 'Đang đăng nhập'}
            </p>
          </div>
          <div className="w-10 h-10 bg-[var(--color-brand-accent)] text-[var(--color-brand-primary)] rounded-full flex items-center justify-center font-bold">
            <User size={20} />
          </div>
          
          <div className="absolute top-full right-0 pt-2 w-48 hidden group-hover:block z-50">
            <div className="bg-white border border-gray-100 shadow-lg rounded-xl overflow-hidden p-1">
              <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-400">
                {profile?.email || 'Tài khoản nội bộ'}
              </div>
              <button 
                onClick={() => {
                  authStore.getState().clearAuth();
                  window.location.href = '/login';
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-sm text-red-600 font-medium rounded-lg transition"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

