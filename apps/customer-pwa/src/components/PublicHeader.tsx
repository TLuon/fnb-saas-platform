'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, User } from 'lucide-react';
import { authStore } from '@fnb/utils';
import { useStore } from 'zustand';
import { usePathname } from 'next/navigation';

export function PublicHeader() {
  const isAuthenticated = useStore(authStore, (state) => state.isAuthenticated);
  const profile = useStore(authStore, (state) => state.profile);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-[#FFFFFF] shadow-sm border-b border-[#E8DED5]">
      <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-black font-serif text-[#543310]">F&B SaaS</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            href="/menu" 
            className={`font-medium transition-colors ${pathname.startsWith('/menu') ? 'text-[#D67D3E]' : 'text-[#222222] hover:text-[#D67D3E]'}`}
          >
            Thực đơn
          </Link>
          <Link 
            href="/reservation" 
            className={`font-medium transition-colors ${pathname.startsWith('/reservation') ? 'text-[#D67D3E]' : 'text-[#222222] hover:text-[#D67D3E]'}`}
          >
            Đặt bàn
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link href="/cart" className="relative p-2 text-[#543310] hover:text-[#D67D3E] transition-colors">
                <ShoppingBag size={24} />
                {/* Dummy cart count for UI */}
                <span className="absolute top-0 right-0 bg-[#B42318] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  0
                </span>
              </Link>
              <Link href="/profile" className="flex items-center gap-2 text-[#543310] hover:text-[#D67D3E] transition-colors">
                <div className="w-8 h-8 rounded-full bg-[#FAF7F3] border border-[#E8DED5] flex items-center justify-center">
                  <User size={18} />
                </div>
                <span className="text-sm font-bold hidden md:block">
                  {profile?.full_name?.split(' ').pop() || 'Tài khoản'}
                </span>
              </Link>
            </>
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
