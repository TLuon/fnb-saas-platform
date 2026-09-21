import { create } from 'zustand';
import { authStore } from '@fnb/utils';

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
  addCategory: (c: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addProduct: (p: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProduct: (id: string) => Promise<void>;
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  categories: [],
  products: [],

  fetchMenu: async () => {
    try {
      const token = authStore.getState().accessToken;

      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const baseUrl =
        import.meta.env.VITE_API_URL ||
        'http://localhost:3001/api/v1';

      const [catRes, prodRes] = await Promise.all([
        fetch(`${baseUrl}/categories`, { headers }),
        fetch(`${baseUrl}/products`, { headers }),
      ]);

      if (!catRes.ok) {
        throw new Error(
          `Categories API failed: ${catRes.status}`,
        );
      }

      if (!prodRes.ok) {
        throw new Error(
          `Products API failed: ${prodRes.status}`,
        );
      }

      const rawCategories = await catRes.json();
      const rawProducts = await prodRes.json();

      // Backend trả { success, data, error }
      const categoryData = Array.isArray(rawCategories)
        ? rawCategories
        : rawCategories.data ?? [];

      const productData = Array.isArray(rawProducts)
        ? rawProducts
        : rawProducts.data ?? [];

      const categories: Category[] = categoryData.map(
        (c: any) => ({
          id: c.id,
          name: c.name,
        }),
      );

      const products: Product[] = productData.map(
        (p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price ?? 0),

          categoryId:
            p.category_id ??
            p.categoryId ??
            '',

          category_id:
            p.category_id ??
            p.categoryId ??
            '',

          active:
            p.is_active !== undefined
              ? p.is_active
              : p.active !== undefined
                ? p.active
                : true,

          is_active:
            p.is_active !== undefined
              ? p.is_active
              : p.active !== undefined
                ? p.active
                : true,
        }),
      );

      set({
        categories,
        products,
      });

      console.log('MENU LOADED:', {
        categories,
        products,
      });
    } catch (error) {
      console.error(
        'Failed to fetch menu:',
        error,
      );

      set({
        categories: [],
        products: [],
      });
    }
  },

  addCategory: async (categoryData) => {
    const token = authStore.getState().accessToken;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

    const res = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers,
      body: JSON.stringify(categoryData),
    });
    if (!res.ok) throw new Error('Create category failed');
    const newCat = await res.json();
    const finalCat = newCat.data || newCat;
    set((state) => ({ categories: [...state.categories, finalCat] }));
  },

  updateCategory: async (id, name) => {
    const token = authStore.getState().accessToken;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

    const res = await fetch(`${baseUrl}/categories/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Update category failed');
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  },

  deleteCategory: async (id) => {
    const token = authStore.getState().accessToken;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

    const res = await fetch(`${baseUrl}/categories/${id}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error('Delete category failed');
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));
  },

  addProduct: async (productData) => {
    const token = authStore.getState().accessToken;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

    const payload = {
      ...productData,
      category_id: productData.categoryId,
    };

    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Create product failed');
    const newProd = await res.json();
    const finalProd = newProd.data || newProd;
    set((state) => ({ 
      products: [...state.products, {
        id: finalProd.id,
        name: finalProd.name,
        price: Number(finalProd.price),
        categoryId: finalProd.category_id || productData.categoryId,
        active: finalProd.is_active ?? true,
      }] 
    }));
  },

  updateProduct: async (id, data) => {
    const token = authStore.getState().accessToken;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

    const payload: any = { ...data };
    if (data.categoryId) {
      payload.category_id = data.categoryId;
      delete payload.categoryId;
    }

    const res = await fetch(`${baseUrl}/products/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Update product failed');
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));
  },

  deleteProduct: async (id) => {
    const token = authStore.getState().accessToken;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

    const res = await fetch(`${baseUrl}/products/${id}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error('Delete product failed');
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }));
  },

  toggleProduct: async (id) => {
    const product = get().products.find(
      (p) => p.id === id,
    );

    if (!product) {
      return;
    }

    const newStatus = !product.active;

    // Optimistic update
    set((state) => ({
      products: state.products.map(
        (item) =>
          item.id === id
            ? {
                ...item,
                active: newStatus,
                is_active: newStatus,
              }
            : item,
      ),
    }));

    try {
      const token =
        authStore.getState().accessToken;

      const headers: Record<
        string,
        string
      > = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization =
          `Bearer ${token}`;
      }

      const baseUrl =
        import.meta.env.VITE_API_URL ||
        'http://localhost:3001/api/v1';

      const response = await fetch(
        `${baseUrl}/products/${id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            is_active: newStatus,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Product update failed: ${response.status}`,
        );
      }
    } catch (error) {
      console.error(
        'Failed to toggle product:',
        error,
      );

      // rollback optimistic update
      set((state) => ({
        products: state.products.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  active: !newStatus,
                  is_active: !newStatus,
                }
              : item,
        ),
      }));
    }
  },
}));