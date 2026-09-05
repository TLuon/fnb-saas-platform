import React from 'react';
import { useAuthStore } from '../store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: 'OWNER' | 'STAFF' | 'SUPPORT';
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiredRole }) => {
  const { currentUser } = useAuthStore();

  // OWNER has access to everything
  const authorized = currentUser.role === requiredRole || currentUser.role === 'OWNER';

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-brand-neutral)]">
        <div className="p-6 max-w-sm w-full bg-[var(--color-brand-secondary)] text-[var(--color-brand-neutral)] rounded-xl shadow-md text-center">
          <h2 className="text-xl font-bold mb-2">Truy cập bị từ chối</h2>
          <p>Tài khoản của bạn không có quyền {requiredRole} để vào trang này.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
