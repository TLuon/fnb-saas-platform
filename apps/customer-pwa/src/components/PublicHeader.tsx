'use client';

import React from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { authStore } from '@fnb/utils';
import { useStore } from 'zustand';
import { usePathname } from 'next/navigation';

export function PublicHeader() {
  const isAuthenticated = useStore(authStore, (state) => state.isAuthenticated);
  const profile = useStore(authStore, (state) => state.profile);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 shadow-sm border-b border-white/40">
      <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-black font-serif text-[#543310]">F&B SaaS</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link 
            href="/" 
            className={`font-black uppercase tracking-wider text-sm transition-all pb-1 border-b-2 ${pathname === '/' ? 'text-[#543310] border-[#543310]' : 'text-[#6B625B] border-transparent hover:text-[#543310] hover:border-[#E8DED5]'}`}
          >
            Trang chủ
          </Link>
          <Link 
            href="/menu" 
            className={`font-black uppercase tracking-wider text-sm transition-all pb-1 border-b-2 ${pathname?.startsWith('/menu') ? 'text-[#543310] border-[#543310]' : 'text-[#6B625B] border-transparent hover:text-[#543310] hover:border-[#E8DED5]'}`}
          >
            Thực đơn
          </Link>
          <Link 
            href="/floors"
            className={`font-black uppercase tracking-wider text-sm transition-all pb-1 border-b-2 ${pathname?.startsWith('/floors') || pathname?.startsWith('/reservation') ? 'text-[#543310] border-[#543310]' : 'text-[#6B625B] border-transparent hover:text-[#543310] hover:border-[#E8DED5]'}`}
          >
            Đặt bàn
          </Link>
          {isAuthenticated && (
            <Link 
              href="/orders" 
              className={`font-black uppercase tracking-wider text-sm transition-all pb-1 border-b-2 ${pathname?.startsWith('/orders') ? 'text-[#543310] border-[#543310]' : 'text-[#6B625B] border-transparent hover:text-[#543310] hover:border-[#E8DED5]'}`}
            >
              Lịch sử giao dịch
            </Link>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link href="/profile" className="flex items-center gap-2 text-[#543310] hover:text-[#D67D3E] transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#FAF7F3] border border-[#E8DED5] flex items-center justify-center">
                <User size={18} />
              </div>
              <span className="text-sm font-bold hidden md:block">
                {profile?.full_name?.split(' ').pop() || 'Tài khoản'}
              </span>
            </Link>
          ) : (
            <Link 
              href="/login"
              className="px-4 py-2 text-sm font-bold text-[#543310] border border-[#543310] rounded hover:bg-[#543310] hover:text-white transition-colors"
            >
              Đăng Nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

