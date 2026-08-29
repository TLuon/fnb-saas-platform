import React, { useEffect, useState } from 'react';
import { hasRole } from '@fnb/utils';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: 'OWNER' | 'STAFF' | 'SUPPORT';
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiredRole }) => {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Vite dashboard dùng localStorage để lưu JWT
    const token = localStorage.getItem('jwt');
    if (!token) {
      setAuthorized(false);
      return;
    }
    setAuthorized(hasRole(token, requiredRole));
  }, [requiredRole]);

  if (authorized === null) return <div className="p-4">Đang kiểm tra quyền...</div>;

  if (authorized === false) {
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
