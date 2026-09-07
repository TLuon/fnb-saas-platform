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
  category_id?: string;
  active: boolean;
  is_active?: boolean;
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
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      
      const [catRes, prodRes] = await Promise.all([
        fetch(`${baseUrl}/categories`, { headers }),
        fetch(`${baseUrl}/products`, { headers })
      ]);
      
      if (catRes.ok && prodRes.ok) {
        const rawCategories = await catRes.json();
        const rawProducts = await prodRes.json();

        const categories: Category[] = Array.isArray(rawCategories) ? rawCategories : [];
        const products: Product[] = Array.isArray(rawProducts)
          ? rawProducts.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              categoryId: p.category_id || p.categoryId || '',
              category_id: p.category_id || p.categoryId || '',
              active: p.is_active !== undefined ? p.is_active : (p.active !== undefined ? p.active : true),
              is_active: p.is_active !== undefined ? p.is_active : (p.active !== undefined ? p.active : true),
            }))
          : [];

        set({ categories, products });
      }
    } catch (e) {
      console.error('Failed to fetch menu', e);
    }
  },

  addCategory: async (c) => {
    set(state => ({ categories: [...state.categories, c] }));
  },
  
  addProduct: async (p) => {
    set(state => ({ products: [...state.products, p] }));
  },

  toggleProduct: async (id) => {
    const p = get().products.find(p => p.id === id);
    if (!p) return;
    const newStatus = !p.active;

    // Optimistic update
    set(state => ({
      products: state.products.map(item =>
        item.id === id ? { ...item, active: newStatus, is_active: newStatus } : item
      )
    }));

    try {
      const token = useAuthStore.getState().accessToken;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${baseUrl}/products/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_active: newStatus })
      });
      if (!res.ok) throw new Error('API failed');
    } catch (e) {
      // Revert
      set(state => ({
        products: state.products.map(item =>
          item.id === id ? { ...item, active: !newStatus, is_active: !newStatus } : item
        )
      }));
    }
  }
}));
