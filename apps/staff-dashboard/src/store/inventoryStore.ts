import { create } from 'zustand';
import { apiClient, authStore } from '@fnb/utils';

export interface Ingredient {
  id: string;
  tenantId: string | null;
  name: string;
  sku: string | null;
  unit: string;
  stock: number;
  minStock: number | null;
  costPerUnit: number | null;
}

export interface InventoryTransaction {
  id: string;
  ingredientId: string;
  ingredientName: string;
  type: 'IN' | 'OUT' | 'WASTE' | 'ADJUSTMENT' | 'ORDER_CONSUMPTION';
  quantity: number;
  balanceAfter: number | null;
  date: string;
  user: string;
  note: string;
}

export interface ProductOption {
  id: string;
  name: string;
}

export interface ProductRecipe {
  id: string;
  productId: string;
  ingredientId: string;
  ingredientName: string;
  ingredientUnit: string;
  amount: number;
}

export interface IngredientInput {
  name: string;
  sku?: string;
  unit: string;
  current_stock?: number;
  min_stock_alert?: number;
  cost_per_unit?: number;
}

export interface RecipeInput {
  product_id: string;
  ingredient_id: string;
  amount: number;
}

export interface TransactionInput {
  ingredientId: string;
  type: 'IN' | 'OUT' | 'WASTE' | 'ADJUSTMENT';
  quantity: number;
  note?: string;
}

interface InventoryStore {
  ingredients: Ingredient[];
  transactions: InventoryTransaction[];
  recipes: ProductRecipe[];
  products: ProductOption[];
  loading: boolean;
  error: string | null;

  fetchIngredients: () => Promise<void>;
  fetchIngredient: (id: string) => Promise<Ingredient>;
  createIngredient: (data: IngredientInput) => Promise<Ingredient>;
  updateIngredient: (id: string, data: IngredientInput) => Promise<Ingredient>;
  deleteIngredient: (id: string) => Promise<void>;
  fetchTransactions: () => Promise<void>;
  addTransaction: (data: TransactionInput) => Promise<void>;
  fetchRecipes: (productId?: string) => Promise<void>;
  createRecipe: (data: RecipeInput) => Promise<ProductRecipe>;
  deleteRecipe: (productId: string, ingredientId: string) => Promise<void>;
  fetchProducts: () => Promise<void>;
}

export function unwrapApiData(response: unknown): unknown {
  if (response == null || typeof response !== 'object') return response;

  const record = response as Record<string, unknown>;
  if ('success' in record && 'data' in record) return record.data;

  const nestedData = record.data;
  if (
    nestedData &&
    typeof nestedData === 'object' &&
    ('success' in (nestedData as Record<string, unknown>) ||
      'data' in (nestedData as Record<string, unknown>))
  ) {
    return unwrapApiData(nestedData);
  }

  if ('data' in record && ('status' in record || 'headers' in record || 'config' in record)) {
    return nestedData;
  }

  return response;
}

function listFromResponse(response: unknown): unknown[] {
  const payload = unwrapApiData(response);
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;

  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const candidate =
      record.data ?? record.items ?? record.records ?? record.results ?? record.ingredients;
    if (Array.isArray(candidate)) return candidate;
  }

  throw new Error('Dữ liệu kho không hợp lệ');
}

function numberOrZero(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function optionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function normalizeIngredient(raw: unknown): Ingredient {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Dữ liệu nguyên vật liệu không hợp lệ');
  }

  const item = raw as Record<string, unknown>;
  const id = stringOrFallback(item.id, '');
  if (!id) throw new Error('Dữ liệu nguyên vật liệu không hợp lệ');

  return {
    id,
    tenantId: optionalString(item.tenant_id ?? item.tenantId),
    name: stringOrFallback(item.name, ''),
    sku: optionalString(item.sku),
    unit: stringOrFallback(item.unit, ''),
    stock: numberOrZero(item.current_stock ?? item.stock),
    minStock: optionalNumber(item.min_stock_alert ?? item.minStock),
    costPerUnit: optionalNumber(item.cost_per_unit ?? item.costPerUnit),
  };
}

export function normalizeIngredientList(response: unknown): Ingredient[] {
  return listFromResponse(response).map((item) => normalizeIngredient(item));
}

function normalizeTransactionType(value: unknown): InventoryTransaction['type'] {
  if (value === 'IMPORT') return 'IN';
  if (value === 'EXPORT') return 'OUT';
  if (value === 'ADJUSTMENT') return 'ADJUSTMENT';
  if (value === 'ORDER_CONSUMPTION') return 'ORDER_CONSUMPTION';
  return 'WASTE';
}

export function normalizeTransactionList(response: unknown): InventoryTransaction[] {
  return listFromResponse(response).map((raw) => {
    const item = raw as Record<string, unknown>;
    const ingredient = item.ingredients as { name?: unknown } | null | undefined;
    return {
      id: stringOrFallback(item.id, ''),
      ingredientId: stringOrFallback(item.ingredient_id, ''),
      ingredientName: stringOrFallback(ingredient?.name, 'Nguyên liệu'),
      type: normalizeTransactionType(item.type),
      quantity: numberOrZero(item.quantity),
      balanceAfter: optionalNumber(item.balance_after),
      date: stringOrFallback(item.created_at, new Date().toISOString()),
      user: stringOrFallback(item.created_by, 'Nhân viên'),
      note: stringOrFallback(item.notes, ''),
    };
  });
}

export function normalizeRecipeList(response: unknown): ProductRecipe[] {
  return listFromResponse(response).map((raw) => {
    const item = raw as Record<string, unknown>;
    const ingredient = item.ingredients as { name?: unknown; unit?: unknown } | null | undefined;
    return {
      id: stringOrFallback(item.id, `${item.product_id ?? ''}:${item.ingredient_id ?? ''}`),
      productId: stringOrFallback(item.product_id, ''),
      ingredientId: stringOrFallback(item.ingredient_id, ''),
      ingredientName: stringOrFallback(ingredient?.name, 'Nguyên liệu'),
      ingredientUnit: stringOrFallback(ingredient?.unit, ''),
      amount: numberOrZero(item.amount),
    };
  });
}

export function normalizeProductList(response: unknown): ProductOption[] {
  return listFromResponse(response).map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      id: stringOrFallback(item.id, ''),
      name: stringOrFallback(item.name, 'Sản phẩm'),
    };
  }).filter((product) => product.id);
}

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const response = record.response as { data?: { message?: unknown; error?: { message?: unknown } } } | undefined;
    if (typeof response?.data?.error?.message === 'string') return response.data.error.message;
    if (typeof response?.data?.message === 'string') return response.data.message;
    if (typeof record.message === 'string') return record.message;
  }
  return fallback;
}

function pruneEmptyFields(data: IngredientInput): IngredientInput {
  return {
    name: data.name.trim(),
    unit: data.unit.trim(),
    ...(data.sku?.trim() ? { sku: data.sku.trim() } : {}),
    ...(data.current_stock !== undefined ? { current_stock: Number(data.current_stock) } : {}),
    ...(data.min_stock_alert !== undefined ? { min_stock_alert: Number(data.min_stock_alert) } : {}),
    ...(data.cost_per_unit !== undefined ? { cost_per_unit: Number(data.cost_per_unit) } : {}),
  };
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  ingredients: [],
  transactions: [],
  recipes: [],
  products: [],
  loading: false,
  error: null,

  fetchIngredients: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/inventory/ingredients');
      set({ ingredients: normalizeIngredientList(res), loading: false });
    } catch (error) {
      set({ error: errorMessage(error, 'Không thể tải nguyên vật liệu'), loading: false });
    }
  },

  fetchIngredient: async (id) => {
    try {
      const res = await apiClient.get(`/inventory/ingredients/${id}`);
      return normalizeIngredient(unwrapApiData(res));
    } catch (error) {
      throw new Error(errorMessage(error, 'Không thể tải chi tiết nguyên vật liệu'));
    }
  },

  createIngredient: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/inventory/ingredients', pruneEmptyFields(data));
      const ingredient = normalizeIngredient(unwrapApiData(res));
      await get().fetchIngredients();
      set({ loading: false });
      return ingredient;
    } catch (error) {
      const message = errorMessage(error, 'Không thể tạo nguyên vật liệu');
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  updateIngredient: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.patch(`/inventory/ingredients/${id}`, pruneEmptyFields(data));
      const ingredient = normalizeIngredient(unwrapApiData(res));
      await get().fetchIngredients();
      set({ loading: false });
      return ingredient;
    } catch (error) {
      const message = errorMessage(error, 'Không thể cập nhật nguyên vật liệu');
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  deleteIngredient: async (id) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/inventory/ingredients/${id}`);
      await get().fetchIngredients();
      set({ loading: false });
    } catch (error) {
      const message = errorMessage(error, 'Không thể xóa nguyên vật liệu');
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  fetchTransactions: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.get('/inventory/transactions');
      set({ transactions: normalizeTransactionList(res), loading: false });
    } catch (error) {
      set({ error: errorMessage(error, 'Không thể tải lịch sử kho'), loading: false });
    }
  },

  addTransaction: async (data) => {
    set({ loading: true, error: null });
    try {
      const branchId =
        authStore.getState().profile?.branch_id ||
        authStore.getState().branchId ||
        '22222222-2222-2222-2222-222222222222';
      const backendType =
        data.type === 'IN' ? 'IMPORT' : data.type === 'OUT' ? 'EXPORT' : 'ADJUSTMENT';

      await apiClient.post('/inventory/transactions', {
        ingredient_id: data.ingredientId,
        branch_id: branchId,
        type: backendType,
        quantity: Number(data.quantity),
        notes: data.note?.trim() || undefined,
      });

      await get().fetchIngredients();
      await get().fetchTransactions();
      set({ loading: false });
    } catch (error) {
      const message = errorMessage(error, 'Lỗi khi ghi phiếu kho');
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  fetchRecipes: async (productId) => {
    set({ loading: true, error: null });
    try {
      const query = productId ? `?product_id=${productId}` : '';
      const res = await apiClient.get(`/inventory/recipes${query}`);
      set({ recipes: normalizeRecipeList(res), loading: false });
    } catch (error) {
      set({ error: errorMessage(error, 'Không thể tải định lượng'), loading: false });
    }
  },

  createRecipe: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/inventory/recipes', {
        product_id: data.product_id,
        ingredient_id: data.ingredient_id,
        amount: Number(data.amount),
      });
      const recipe = normalizeRecipeList([unwrapApiData(res)])[0];
      await get().fetchRecipes();
      set({ loading: false });
      return recipe;
    } catch (error) {
      const message = errorMessage(error, 'Không thể lưu định lượng');
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  deleteRecipe: async (productId, ingredientId) => {
    set({ loading: true, error: null });
    try {
      await apiClient.delete(`/inventory/recipes/${productId}/ingredients/${ingredientId}`);
      await get().fetchRecipes();
      set({ loading: false });
    } catch (error) {
      const message = errorMessage(error, 'Không thể xóa định lượng');
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  fetchProducts: async () => {
    try {
      const res = await apiClient.get('/products');
      set({ products: normalizeProductList(res) });
    } catch {
      set({ products: [] });
    }
  },
}));
