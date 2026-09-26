import { create } from 'zustand';
import { apiClient } from '@fnb/utils';

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
  image_url?: string;
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
  uploadImage: (file: File) => Promise<string>;
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  categories: [],
  products: [],

  fetchMenu: async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        apiClient.get('/categories'),
        apiClient.get('/products'),
      ]);

      const categoryData = catRes.data?.data || catRes.data || catRes || [];
      const productData = prodRes.data?.data || prodRes.data || prodRes || [];

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
          image_url: p.image_url || '',
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
    const res = await apiClient.post('/categories', categoryData);
    const finalCat = res.data?.data || res.data || (res as any);
    set((state) => ({ categories: [...state.categories, finalCat] }));
  },

  updateCategory: async (id, name) => {
    await apiClient.patch(`/categories/${id}`, { name });
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  },

  deleteCategory: async (id) => {
    await apiClient.delete(`/categories/${id}`);
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));
  },

  addProduct: async (productData) => {
    const payload = {
      ...productData,
      category_id: productData.categoryId,
    };
    const res = await apiClient.post('/products', payload);
    const finalProd = res.data?.data || res.data || (res as any);
    set((state) => ({
      products: [...state.products, {
        id: finalProd.id,
        name: finalProd.name,
        price: Number(finalProd.price),
        categoryId: finalProd.category_id || productData.categoryId,
        category_id: finalProd.category_id || productData.categoryId,
        active: finalProd.is_active ?? true,
        is_active: finalProd.is_active ?? true,
        image_url: finalProd.image_url || productData.image_url || '',
      }]
    }));
  },

  updateProduct: async (id, data) => {
    const payload: any = { ...data };
    if (data.categoryId) {
      payload.category_id = data.categoryId;
      delete payload.categoryId;
    }
    const res = await apiClient.patch(`/products/${id}`, payload);
    const finalProd = res.data?.data || res.data || (res as any);
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id
          ? {
              ...p,
              ...data,
              image_url:
                finalProd?.image_url !== undefined
                  ? finalProd.image_url
                  : data.image_url !== undefined
                    ? data.image_url
                    : p.image_url,
            }
          : p,
      ),
    }));
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post('/products/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = (res as any)?.data?.data ?? (res as any)?.data ?? res;
    if (!data?.secure_url) {
      throw new Error(data?.message || 'Không thể lấy URL hình ảnh từ máy chủ');
    }
    return data.secure_url;
  },

  deleteProduct: async (id) => {
    await apiClient.delete(`/products/${id}`);
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
      await apiClient.patch(`/products/${id}`, {
        is_active: newStatus,
      });
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