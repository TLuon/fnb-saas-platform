'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { authStore } from '@fnb/utils';
import { useStore } from 'zustand';
import { LoginRequiredModal } from '../components/LoginRequiredModal';

const PROTECTED_ROUTES = ['/cart', '/checkout', '/wallet', '/orders', '/reservation', '/profile'];

export function useAuthGuard() {
  const pathname = usePathname();
  const isAuthenticated = useStore(authStore, state => state.isAuthenticated);
  const isLoading = useStore(authStore, state => state.isLoading);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
    if (isProtected && !isAuthenticated) {
      setShowLoginModal(true);
    } else {
      setShowLoginModal(false);
    }
  }, [pathname, isAuthenticated, isLoading]);

  const requireAuth = (action: () => void) => {
    if (isAuthenticated) {
      action();
    } else {
      setShowLoginModal(true);
    }
  };

  return { showLoginModal, setShowLoginModal, pathname, requireAuth };
}
