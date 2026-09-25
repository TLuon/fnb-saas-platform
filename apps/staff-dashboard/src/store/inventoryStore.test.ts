import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '@fnb/utils';
import { normalizeIngredientList, useInventoryStore } from './inventoryStore';

describe('useInventoryStore', () => {
  beforeEach(() => {
    useInventoryStore.setState({
      ingredients: [],
      transactions: [],
      recipes: [],
      products: [],
      loading: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  it('maps backend ingredient fields without fabricating min stock or cost', () => {
    const ingredients = normalizeIngredientList([
      {
        id: 'ing-1',
        tenant_id: 'tenant-1',
        name: 'Cafe test runtime',
        sku: 'TEST-CAFE-001',
        unit: 'g',
        current_stock: 980,
        min_stock_alert: 100,
        cost_per_unit: 0,
      },
      {
        id: 'ing-2',
        name: 'No optional fields',
        unit: 'ml',
        current_stock: 5,
      },
    ]);

    expect(ingredients[0]).toMatchObject({
      stock: 980,
      minStock: 100,
      costPerUnit: 0,
    });
    expect(ingredients[1].minStock).toBeNull();
    expect(ingredients[1].costPerUnit).toBeNull();
  });

  it('creates an ingredient and refreshes the list', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      id: 'ing-new',
      tenant_id: 'tenant-1',
      name: 'Codex test ingredient',
      sku: 'INV-CODEX-001',
      unit: 'g',
      current_stock: 12,
      min_stock_alert: 2,
      cost_per_unit: 9,
    } as any);
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce([
      {
        id: 'ing-new',
        name: 'Codex test ingredient',
        unit: 'g',
        current_stock: 12,
        min_stock_alert: 2,
        cost_per_unit: 9,
      },
    ] as any);

    const ingredient = await useInventoryStore.getState().createIngredient({
      name: 'Codex test ingredient',
      sku: 'INV-CODEX-001',
      unit: 'g',
      current_stock: 12,
      min_stock_alert: 2,
      cost_per_unit: 9,
    });

    expect(postSpy).toHaveBeenCalledWith('/inventory/ingredients', {
      name: 'Codex test ingredient',
      sku: 'INV-CODEX-001',
      unit: 'g',
      current_stock: 12,
      min_stock_alert: 2,
      cost_per_unit: 9,
    });
    expect(getSpy).toHaveBeenCalledWith('/inventory/ingredients');
    expect(ingredient.id).toBe('ing-new');
    expect(useInventoryStore.getState().ingredients).toHaveLength(1);
  });

  it('surfaces duplicate SKU API errors', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce({
      response: {
        data: {
          error: { message: 'Mã SKU INV-CODEX-001 đã tồn tại' },
        },
      },
    });

    await expect(
      useInventoryStore.getState().createIngredient({
        name: 'Duplicate',
        sku: 'INV-CODEX-001',
        unit: 'g',
      }),
    ).rejects.toThrow('Mã SKU INV-CODEX-001 đã tồn tại');

    expect(useInventoryStore.getState().error).toBe('Mã SKU INV-CODEX-001 đã tồn tại');
  });
});
