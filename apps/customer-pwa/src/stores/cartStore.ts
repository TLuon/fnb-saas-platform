import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string; // unique string for the item in cart (could be productId + modifiers)
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  modifiers?: string;
  note?: string;
  isAvailable?: boolean; // Default to true, updated when checking with server
}

export interface CartState {
  items: CartItem[];
  orderNote: string;
  reservationCode?: string;
  tableName?: string;
  
  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  setOrderNote: (note: string) => void;
  setReservationCode: (code?: string, tableName?: string) => void;
  clearCart: () => void;
  
  // Computed (can be derived in component, but convenient here)
  getSubtotal: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderNote: '',
      reservationCode: undefined,
      tableName: undefined,
      
      addItem: (newItem) => set((state) => {
        // Generate a unique ID based on product + modifiers to stack identical items
        const id = `${newItem.productId}-${newItem.modifiers || ''}-${newItem.note || ''}`;
        const existingItemIndex = state.items.findIndex(item => item.id === id);
        
        if (existingItemIndex >= 0) {
          // Increment quantity
          const updatedItems = [...state.items];
          updatedItems[existingItemIndex].quantity += newItem.quantity;
          return { items: updatedItems };
        } else {
          // Add new
          return { items: [...state.items, { ...newItem, id, isAvailable: true }] };
        }
      }),
      
      removeItem: (id) => set((state) => ({
        items: state.items.filter(item => item.id !== id)
      })),
      
      updateQuantity: (id, delta) => set((state) => {
        const updatedItems = state.items.map(item => {
          if (item.id === id) {
            const newQuantity = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQuantity };
          }
          return item;
        });
        return { items: updatedItems };
      }),
      
      setOrderNote: (note) => set({ orderNote: note }),
      
      setReservationCode: (code, tableName) => set({ reservationCode: code, tableName }),
      
      clearCart: () => set({ items: [], orderNote: '', reservationCode: undefined, tableName: undefined }),
      
      getSubtotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      }
    }),
    {
      name: 'customer-cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
