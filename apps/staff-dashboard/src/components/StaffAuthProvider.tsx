import React, { useEffect, useState } from 'react';
import { authStore, apiClient } from '@fnb/utils';
import { useStore } from 'zustand';

export const StaffAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLoading = useStore(authStore, (state) => state.isLoading);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    authStore.getState().hydrate();
    setIsHydrated(true);

    const fetchProfile = async () => {
      const state = authStore.getState();
      if (state.isAuthenticated && state.accessToken) {
        try {
          const payload: any = await apiClient.get('/auth/me');
          
          state.setProfile({
            id: payload.sub || payload.profile?.id || payload.id || 'user-id',
            email: payload.email,
            full_name: payload.profile?.full_name || payload.email,
            is_active: payload.is_active !== false,
          });
        } catch (e: any) {
          console.error('Failed to fetch profile', e);
          if (e?.code === 'ERR_UNKNOWN' || e?.message === 'Lỗi máy chủ' || e?.response?.status === 401) {
             state.clearAuth();
          }
        }
      }
    };

    fetchProfile();
  }, []);

  if (!isHydrated || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-brand-neutral)]">
        <div className="text-[var(--color-brand-primary)] font-medium">Đang nạp dữ liệu...</div>
      </div>
    );
  }

  return <>{children}</>;
};
