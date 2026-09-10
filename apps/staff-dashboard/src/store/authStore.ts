import { create } from 'zustand';

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  email?: string;
  branch_id?: string;
}

interface AuthStore {
  currentUser: UserProfile;
  accessToken: string;
  switchUser: (id: string, name: string, role: string) => void;
  setAccessToken: (token: string) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const getStoredToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token') || '';
  }
  return '';
};

const getStoredUser = (): UserProfile => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
  }
  return { id: '', name: '', role: '' };
};

export const useAuthStore = create<AuthStore>((set) => ({
  currentUser: getStoredUser(),
  accessToken: getStoredToken(),

  switchUser: (id, name, role) => {
    const user: UserProfile = { id, name, role };
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_user', JSON.stringify(user));
    }
    set({ currentUser: user });
  },

  setAccessToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('access_token', token);
      } else {
        localStorage.removeItem('access_token');
      }
    }
    set({ accessToken: token });
  },

  login: async (email: string, password: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const resJson = await res.json();
      const payload = resJson?.data ?? resJson;
      if (!res.ok || !payload?.access_token) {
        return {
          success: false,
          error: resJson?.error?.message || payload?.message || 'Đăng nhập thất bại',
        };
      }

      const token = payload.access_token;
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', token);
      }

      // Fetch user profile from /auth/me
      let userProfile: UserProfile = {
        id: '',
        name: email,
        role: 'STAFF',
        email,
      };

      try {
        const meRes = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const rawMe = await meRes.json();
          const meData = rawMe?.data ?? rawMe;
          userProfile = {
            id: meData.sub || meData.profile?.id || meData.id || 'user-id',
            name: meData.profile?.full_name || meData.email || email,
            role: meData.role_app || meData.role || 'STAFF',
            email: meData.email || email,
            branch_id: meData.branch_id || meData.profile?.branch_id,
          };
        }
      } catch (meErr) {
        console.warn('Could not fetch user profile, using basic info', meErr);
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('current_user', JSON.stringify(userProfile));
      }

      set({ accessToken: token, currentUser: userProfile });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi kết nối máy chủ' };
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('current_user');
    }
    set({
      accessToken: '',
      currentUser: { id: '', name: '', role: '' },
    });
  },
}));
