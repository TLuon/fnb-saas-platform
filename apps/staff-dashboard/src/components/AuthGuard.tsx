import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: 'OWNER' | 'STAFF' | 'SUPPORT';
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiredRole }) => {
  const { currentUser, accessToken, logout } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  // OWNER has access to everything
  const authorized = currentUser.role === requiredRole || currentUser.role === 'OWNER';

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-brand-neutral)]">
        <div className="p-8 max-w-sm w-full bg-white rounded-3xl shadow-lg text-center border border-gray-100">
          <h2 className="text-xl font-bold mb-2 text-[var(--color-brand-primary)]">Truy cập bị từ chối</h2>
          <p className="text-gray-500 text-sm mb-6">
            Tài khoản của bạn ({currentUser.role || 'Không xác định'}) không có quyền truy cập trang này ({requiredRole}).
          </p>
          <button
            onClick={logout}
            className="w-full bg-[var(--color-brand-primary)] text-white py-2.5 rounded-xl font-bold hover:bg-[var(--color-brand-secondary)] transition text-sm"
          >
            Đăng xuất / Đổi tài khoản
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
