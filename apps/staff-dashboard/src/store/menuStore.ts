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

  addCategory: async (category) => {
    set((state) => ({
      categories: [
        ...state.categories,
        category,
      ],
    }));
  },

  addProduct: async (product) => {
    set((state) => ({
      products: [
        ...state.products,
        product,
      ],
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
        useAuthStore.getState().accessToken;

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