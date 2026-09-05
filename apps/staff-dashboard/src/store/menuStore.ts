import { create } from 'zustand';

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
  addCategory: (c: Category) => void;
  addProduct: (p: Product) => void;
  toggleProduct: (id: string) => void;
}

export const useMenuStore = create<MenuStore>((set) => ({
  categories: [],
  products: [],
  addCategory: (c) => set(state => ({ categories: [...state.categories, c] })),
  addProduct: (p) => set(state => ({ products: [...state.products, p] })),
  toggleProduct: (id) => set(state => ({
    products: state.products.map(p => 
      p.id === id ? { ...p, active: !p.active } : p
    )
  }))
}));
