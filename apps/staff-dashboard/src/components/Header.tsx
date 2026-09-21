import { Clock, Search, User, Plus } from 'lucide-react';
import { authStore } from '@fnb/utils';
import { useStore } from 'zustand';

export function Header() {
  const profile = useStore(authStore, state => state.profile);
  const role = useStore(authStore, state => state.role);

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shadow-sm">
      <div className="flex items-center bg-[var(--color-brand-neutral)] px-4 py-2 rounded-xl w-96 border border-gray-200 focus-within:border-[var(--color-brand-secondary)] transition">
        <Search size={20} className="text-gray-400 mr-2" />
        <input 
          type="text" 
          placeholder="Tìm kiếm thông tin..." 
          className="bg-transparent border-none outline-none w-full text-[var(--color-brand-primary)]"
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-gray-500 hover:text-[var(--color-brand-secondary)] transition">
          <Clock size={24} />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center gap-3 border-l pl-6 border-gray-200 group relative cursor-pointer">
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
          <Plus size={16} className="text-gray-400" />
          
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
