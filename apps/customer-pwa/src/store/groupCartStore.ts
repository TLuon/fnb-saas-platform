import { create } from 'zustand';
import { CartItem } from './cartStore';

interface GroupCartStore {
  items: CartItem[];
  setItems: (items: CartItem[]) => void;
}

export const useGroupCartStore = create<GroupCartStore>((set) => ({
  items: [],
  setItems: (items) => set({ items })
}));
