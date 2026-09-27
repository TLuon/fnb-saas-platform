import React, { useEffect, useState } from 'react';
import { authStore, apiClient } from '@fnb/utils';
import { useStore } from 'zustand';

export const StaffAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLoading = useStore(authStore, (state) => state.isLoading);
  const [isSessionValidated, setIsSessionValidated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const validateSession = async () => {
      authStore.getState().hydrate();
      const hydratedState = authStore.getState();

      if (hydratedState.isAuthenticated && hydratedState.accessToken) {
        try {
          const payload: any = await apiClient.get('/auth/me');

          if (!['OWNER', 'STAFF', 'SUPPORT'].includes(payload.role_app)) {
            throw new Error('Tài khoản không có quyền truy cập Staff Dashboard');
          }

          authStore.getState().setProfile({
            id: payload.profile?.id || payload.sub || 'user-id',
            auth_user_id: payload.sub,
            role_app: payload.role_app,
            email: payload.email,
            phone: payload.profile?.phone,
            full_name: payload.profile?.full_name || payload.email,
            is_active: payload.profile?.is_active !== false,
            branch_id: payload.branch_id,
            tenant_id: payload.tenant_id,
          });
        } catch (e: any) {
          console.error('Failed to fetch profile', e);
          authStore.getState().clearAuth();
        }
      }

      if (mounted) setIsSessionValidated(true);
    };

    void validateSession();

    const handleUnauthorized = () => {
      authStore.getState().clearAuth();
      window.location.href = '/login';
    };

    window.addEventListener('api:unauthorized', handleUnauthorized);

    return () => {
      mounted = false;
      window.removeEventListener('api:unauthorized', handleUnauthorized);
    };
  }, []);

  if (!isSessionValidated || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-brand-neutral)]">
        <div className="text-[var(--color-brand-primary)] font-medium">Đang nạp dữ liệu...</div>
      </div>
    );
  }

  return <>{children}</>;
};
