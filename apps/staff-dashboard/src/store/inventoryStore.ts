import { create } from 'zustand';

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  costPerUnit: number;
}

export interface InventoryTransaction {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: 'IN' | 'OUT' | 'WASTE';
  quantity: number;
  date: string;
  user: string;
  note: string;
}

interface InventoryStore {
  ingredients: Ingredient[];
  transactions: InventoryTransaction[];
  loading: boolean;
  error: string | null;

  fetchIngredients: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  addTransaction: (data: Omit<InventoryTransaction, 'id' | 'date' | 'ingredientName'>) => Promise<void>;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  ingredients: [],
  transactions: [],
  loading: false,
  error: null,

  fetchIngredients: async () => {
    set({ loading: true, error: null });
    try {
      setTimeout(() => {
        set({
          ingredients: [
            { id: 'ING-01', name: 'Cà phê hạt xay', unit: 'g', stock: 500, minStock: 1000, costPerUnit: 200 }, // Low stock
            { id: 'ING-02', name: 'Sữa đặc Ngôi Sao', unit: 'ml', stock: 5000, minStock: 2000, costPerUnit: 50 },
            { id: 'ING-03', name: 'Đường cát trắng', unit: 'g', stock: 15000, minStock: 5000, costPerUnit: 20 },
            { id: 'ING-04', name: 'Trà Oolong', unit: 'g', stock: 800, minStock: 1000, costPerUnit: 300 }, // Low stock
          ],
          loading: false
        });
      }, 500);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchTransactions: async () => {
    set({ loading: true, error: null });
    try {
      setTimeout(() => {
        set({
          transactions: [
            { id: 'TXN-01', ingredientId: 'ING-01', ingredientName: 'Cà phê hạt xay', type: 'IN', quantity: 5000, date: '2026-09-10T08:00:00Z', user: 'Kho Tổng', note: 'Nhập hàng tuần' },
            { id: 'TXN-02', ingredientId: 'ING-02', ingredientName: 'Sữa đặc Ngôi Sao', type: 'OUT', quantity: 500, date: '2026-09-11T09:00:00Z', user: 'Pha chế', note: 'Xuất dùng quầy bar' },
            { id: 'TXN-03', ingredientId: 'ING-04', ingredientName: 'Trà Oolong', type: 'WASTE', quantity: 200, date: '2026-09-11T10:00:00Z', user: 'Quản lý', note: 'Hàng ẩm mốc' },
          ],
          loading: false
        });
      }, 500);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  addTransaction: async (data) => {
    set({ loading: true, error: null });
    try {
      const ing = get().ingredients.find(i => i.id === data.ingredientId);
      if (!ing) throw new Error("Ingredient not found");

      setTimeout(() => {
        const newTx: InventoryTransaction = {
          ...data,
          id: `TXN-${Date.now()}`,
          ingredientName: ing.name,
          date: new Date().toISOString()
        };

        set((state) => ({
          transactions: [newTx, ...state.transactions],
          ingredients: state.ingredients.map(i => {
            if (i.id === ing.id) {
              const change = data.type === 'IN' ? data.quantity : -data.quantity;
              return { ...i, stock: i.stock + change };
            }
            return i;
          }),
          loading: false
        }));
      }, 500);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  }
}));
