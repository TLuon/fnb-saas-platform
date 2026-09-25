import { createStore } from 'zustand/vanilla';
import { parseToken } from './auth';

export interface UserProfile {
  id: string;
  auth_user_id?: string;
  role_app?: 'OWNER' | 'STAFF' | 'SUPPORT' | 'CUSTOMER';
  email?: string;
  phone?: string;
  full_name?: string;
  avatar_url?: string;
  is_active?: boolean;
  branch_id?: string;
  tenant_id?: string;
  membership_tier?: string;
  loyalty_points?: number;
}


export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  profile: UserProfile | null;
  role: string | null;
  tenantId: string | null;
  branchId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setTokens: (accessToken: string, refreshToken?: string) => void;
  setProfile: (profile: UserProfile) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

export const authStore = createStore<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  profile: null,
  role: null,
  tenantId: null,
  branchId: null,
  isAuthenticated: false,
  isLoading: true,

  setTokens: (accessToken: string, refreshToken?: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
    }
    const payload = parseToken(accessToken);
    set({
      accessToken,
      refreshToken: refreshToken || null,
      profile: null,
      isAuthenticated: true,
      role: payload?.role_app || null,
      tenantId: payload?.tenant_id || null,
      branchId: payload?.branch_id || null,
    });
  },

  setProfile: (profile: UserProfile) => {
    set((state) => ({
      profile,
      role: profile.role_app ?? state.role,
      tenantId: profile.tenant_id ?? state.tenantId,
      branchId: profile.branch_id ?? state.branchId,
    }));
  },

  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      // Xóa cookie cũ nếu có
      document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
    set({
      accessToken: null,
      refreshToken: null,
      profile: null,
      role: null,
      tenantId: null,
      branchId: null,
      isAuthenticated: false,
    });
  },

  hydrate: () => {
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (accessToken) {
        const payload = parseToken(accessToken);
        // Check expiry
        if (payload?.exp && Date.now() >= payload.exp * 1000) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({
            accessToken: null,
            refreshToken: null,
            profile: null,
            role: null,
            tenantId: null,
            branchId: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
          role: payload?.role_app || null,
          tenantId: payload?.tenant_id || null,
          branchId: payload?.branch_id || null,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
