import { create } from 'zustand';
import { useAuthStore } from './authStore';

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  active: boolean;
}

interface MenuStore {
  categories: Category[];
  products: Product[];
  fetchMenu: () => Promise<void>;
  addCategory: (c: Category) => Promise<void>;
  addProduct: (p: Product) => Promise<void>;
  toggleProduct: (id: string) => Promise<void>;
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  categories: [],
  products: [],
  
  fetchMenu: async () => {
    try {
      const token = useAuthStore.getState().accessToken;
      const headers = { 'Authorization': `Bearer ${token}` };
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const [catRes, prodRes] = await Promise.all([
        fetch(`${baseUrl}/menu/categories`, { headers }),
        fetch(`${baseUrl}/menu/products`, { headers })
      ]);
      
      if (catRes.ok && prodRes.ok) {
        set({
          categories: await catRes.json(),
          products: await prodRes.json()
        });
      }
    } catch (e) {
      console.error('Failed to fetch menu', e);
    }
  },

  addCategory: async (c) => {
    // Implement API call if needed, here just basic optimistic update for now
    set(state => ({ categories: [...state.categories, c] }));
  },
  
  addProduct: async (p) => {
    // Implement API call if needed, here just basic optimistic update for now
    set(state => ({ products: [...state.products, p] }));
  },

  toggleProduct: async (id) => {
    const p = get().products.find(p => p.id === id);
    if (!p) return;
    const newStatus = !p.active;

    // Optimistic
    set(state => ({
      products: state.products.map(p => 
        p.id === id ? { ...p, active: newStatus } : p
      )
    }));

    try {
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/menu/products/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active: newStatus })
      });
      if (!res.ok) throw new Error('API failed');
    } catch (e) {
      // Revert
      set(state => ({
        products: state.products.map(p => 
          p.id === id ? { ...p, active: !newStatus } : p
        )
      }));
    }
  }
}));
