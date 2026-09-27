import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authStore } from '@fnb/utils';
import { useStore } from 'zustand';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: 'OWNER' | 'STAFF' | 'SUPPORT';
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiredRole }) => {
  const accessToken = useStore(authStore, state => state.accessToken);
  const role = useStore(authStore, state => state.role);
  const profile = useStore(authStore, state => state.profile);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  const email = (profile?.email || '').toLowerCase();

  // Determine access based on role & sub-role station
  let authorized = false;

  if (role === 'OWNER') {
    authorized = true; // OWNER has access to all routes
  } else if (role === 'SUPPORT') {
    authorized = location.pathname.startsWith('/support');
  } else if (role === 'STAFF') {
    if (requiredRole === 'STAFF') {
      if (email.includes('bep')) {
        authorized = location.pathname === '/kds/kitchen';
      } else if (email.includes('bar')) {
        authorized = location.pathname === '/kds/bar';
      } else {
        // Cashier Staff (staff.runtime@example.com)
        authorized = ['/pos', '/floor-map', '/kds/kitchen', '/kds/bar', '/orders-history'].includes(location.pathname);
      }
    }
  }


  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF7F3]">
        <div className="p-8 max-w-sm w-full bg-white rounded-xl shadow-sm text-center border border-[#E8DED5]">
          <h2 className="text-xl font-bold mb-4 text-[#B42318]">403 - Truy cập bị từ chối</h2>
          <p className="text-[#6B625B] text-sm mb-6">
            Tài khoản của bạn ({role || 'Không xác định'}) không có quyền truy cập trang này.
          </p>
          <button
            onClick={() => authStore.getState().clearAuth()}
            className="w-full bg-[#543310] text-white py-2.5 rounded hover:bg-[#D67D3E] transition-colors font-medium"
          >
            Đăng xuất / Quay lại
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
