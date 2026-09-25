import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import { InventoryService } from './inventory.service.js';
import { InventoryController } from './inventory.controller.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';

describe('InventoryModule Tests', () => {
  let service: InventoryService;
  let controller: InventoryController;
  let mockSupabase: any;
  let mockRealtimeGateway: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const branchId = '22222222-2222-2222-2222-222222222222';
  const publicUserId = '99999999-9999-9999-9999-999999999999';
  const ownerUser: AuthenticatedUser = {
    sub: 'owner-user-1',
    role_app: 'OWNER',
    tenant_id: tenantId,
    branch_id: branchId,
  };
  const staffUser: AuthenticatedUser = {
    sub: 'staff-user-1',
    role_app: 'STAFF',
    tenant_id: tenantId,
    branch_id: branchId,
  };

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    };

    const mockSupabaseService: any = {
      forUser: () => mockSupabase,
      admin: () => mockSupabase,
    };

    mockRealtimeGateway = {
      emitProductOutOfStock: vi.fn(),
    };

    service = new InventoryService(mockSupabaseService, mockRealtimeGateway);
    controller = new InventoryController(service);
  });

  describe('InventoryController Role Permissions', () => {
    const reflector = new Reflector();

    it('should restrict write endpoints to OWNER and allow read to OWNER, STAFF', () => {
      expect(reflector.get('roles', controller.listIngredients)).toEqual(['OWNER', 'STAFF']);
      expect(reflector.get('roles', controller.getIngredient)).toEqual(['OWNER', 'STAFF']);
      expect(reflector.get('roles', controller.createIngredient)).toEqual(['OWNER']);
      expect(reflector.get('roles', controller.updateIngredient)).toEqual(['OWNER']);
      expect(reflector.get('roles', controller.deleteIngredient)).toEqual(['OWNER']);

      expect(reflector.get('roles', controller.getProductRecipes)).toEqual(['OWNER', 'STAFF']);
      expect(reflector.get('roles', controller.listRecipes)).toEqual(['OWNER', 'STAFF']);
      expect(reflector.get('roles', controller.createRecipe)).toEqual(['OWNER']);
      expect(reflector.get('roles', controller.deleteRecipe)).toEqual(['OWNER']);

      expect(reflector.get('roles', controller.createTransaction)).toEqual(['OWNER', 'STAFF']);
      expect(reflector.get('roles', controller.listTransactions)).toEqual(['OWNER', 'STAFF']);
    });
  });

  describe('Ingredients CRUD', () => {
    it('should list ingredients and support search filtering', async () => {
      const query: any = Promise.resolve({
        data: [{ id: 'ing-1', name: 'Hạt Arabica' }],
        error: null,
      });
      query.select = vi.fn().mockReturnValue(query);
      query.order = vi.fn().mockReturnValue(query);
      query.ilike = vi.fn().mockReturnValue(query);
      mockSupabase.from.mockReturnValue(query);

      const result = await service.listIngredients('token', { search: 'Arabica' });
      expect(result).toHaveLength(1);
      expect(query.ilike).toHaveBeenCalledWith('name', '%Arabica%');
    });

    it('should create an ingredient when SKU is unique', async () => {
      const skuCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      const insertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'ing-1', name: 'Sữa đặc', sku: 'SUA-01', current_stock: 10 },
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(skuCheckQuery)
        .mockReturnValueOnce(insertQuery);

      const result = await service.createIngredient('token', ownerUser, {
        name: 'Sữa đặc',
        sku: 'SUA-01',
        unit: 'lon',
        current_stock: 10,
        min_stock_alert: 2,
      });

      expect(result.id).toBe('ing-1');
      expect(result.sku).toBe('SUA-01');
    });

    it('should reject creating ingredient if SKU already exists', async () => {
      const skuCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'existing-ing' }, error: null }),
      };

      mockSupabase.from.mockReturnValue(skuCheckQuery);

      await expect(
        service.createIngredient('token', ownerUser, {
          name: 'Sữa đặc',
          sku: 'SUA-01',
          unit: 'lon',
        }),
      ).rejects.toThrow(AppException);
    });

    it('should block deleting ingredient if it is linked to a recipe', async () => {
      const getQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'ing-1' }, error: null }),
      };

      const recipeCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{ id: 'recipe-1' }], error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(getQuery)
        .mockReturnValueOnce(recipeCheckQuery);

      await expect(service.deleteIngredient('token', ownerUser, 'ing-1')).rejects.toThrow(AppException);
    });
  });

  describe('Recipe Management', () => {
    it('should create or update a recipe for a product', async () => {
      const getIngQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'ing-1' }, error: null }),
      };

      const recipeExistQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      const recipeInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'recipe-1', product_id: 'prod-1', ingredient_id: 'ing-1', amount: 20 },
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(getIngQuery)
        .mockReturnValueOnce(recipeExistQuery)
        .mockReturnValueOnce(recipeInsertQuery);

      const result = await service.createRecipe('token', ownerUser, {
        product_id: 'prod-1',
        ingredient_id: 'ing-1',
        amount: 20,
      });

      expect(result.id).toBe('recipe-1');
      expect(result.amount).toBe(20);
    });
  });

  describe('Inventory Transactions & Realtime Out-Of-Stock', () => {
    it('should process IMPORT transaction and increase stock', async () => {
      const getIngQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'ing-1', current_stock: 5, min_stock_alert: 2 },
          error: null,
        }),
      };

      const updateStockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      const userResolveQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: publicUserId }, error: null }),
      };

      const insertTxQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'tx-1',
            type: 'IMPORT',
            quantity: 10,
            balance_after: 15,
          },
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(getIngQuery)
        .mockReturnValueOnce(userResolveQuery)
        .mockReturnValueOnce(updateStockQuery)
        .mockReturnValueOnce(insertTxQuery);

      const result = await service.createTransaction('token', staffUser, {
        ingredient_id: 'ing-1',
        type: 'IMPORT',
        quantity: 10,
      });

      expect(result.balance_after).toBe(15);
      expect(updateStockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ current_stock: 15 }),
      );
      expect(insertTxQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ created_by: publicUserId }),
      );
    });

    it('should reject EXPORT transaction if current stock is insufficient', async () => {
      const getIngQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'ing-1', current_stock: 3 },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(getIngQuery);

      await expect(
        service.createTransaction('token', staffUser, {
          ingredient_id: 'ing-1',
          type: 'EXPORT',
          quantity: 10,
        }),
      ).rejects.toThrow(AppException);
    });

    it('should emit product_out_of_stock when balance_after drops below min_stock_alert', async () => {
      const getIngQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'ing-1', name: 'Cà phê', current_stock: 5, min_stock_alert: 3 },
          error: null,
        }),
      };

      const updateStockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      const userResolveQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: publicUserId }, error: null }),
      };

      const insertTxQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'tx-2',
            type: 'EXPORT',
            quantity: 4,
            balance_after: 1,
          },
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(getIngQuery)
        .mockReturnValueOnce(userResolveQuery)
        .mockReturnValueOnce(updateStockQuery)
        .mockReturnValueOnce(insertTxQuery);

      await service.createTransaction('token', staffUser, {
        ingredient_id: 'ing-1',
        branch_id: branchId,
        type: 'EXPORT',
        quantity: 4,
      });

      expect(mockRealtimeGateway.emitProductOutOfStock).toHaveBeenCalledWith(
        branchId,
        expect.objectContaining({
          ingredient_id: 'ing-1',
          current_stock: 1,
        }),
      );
    });

    it('should reject transaction with zero or negative quantity', async () => {
      const getIngQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'ing-1', current_stock: 10 },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(getIngQuery);

      await expect(
        service.createTransaction('token', staffUser, {
          ingredient_id: 'ing-1',
          type: 'IMPORT',
          quantity: 0,
        }),
      ).rejects.toThrow(AppException);

      await expect(
        service.createTransaction('token', staffUser, {
          ingredient_id: 'ing-1',
          type: 'EXPORT',
          quantity: -5,
        }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('consumeForCompletedOrder (Atomic & Idempotent Safe Boundary)', () => {
    it('should invoke atomic RPC fn_consume_inventory_for_order with tenant, branch, orderId', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          consumed_items: [
            {
              ingredient_id: 'ing-1',
              ingredient_name: 'Cà phê Robusta',
              current_stock: 2,
              min_stock_alert: 5,
              branch_id: branchId,
            },
          ],
        },
        error: null,
      });

      const result = await service.consumeForCompletedOrder('token', staffUser, 'order-999');

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'fn_consume_inventory_for_order',
        {
          p_tenant_id: tenantId,
          p_branch_id: branchId,
          p_order_id: 'order-999',
        },
      );
      expect(result.success).toBe(true);
      expect(mockRealtimeGateway.emitProductOutOfStock).toHaveBeenCalledWith(
        branchId,
        expect.objectContaining({
          ingredient_id: 'ing-1',
          current_stock: 2,
        }),
      );
    });

    it('should not emit product_out_of_stock when remaining stock is above alert threshold', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: true,
          consumed_items: [
            {
              ingredient_id: 'ing-1',
              ingredient_name: 'Cà phê Robusta',
              current_stock: 50,
              min_stock_alert: 5,
              branch_id: branchId,
            },
          ],
        },
        error: null,
      });

      await service.consumeForCompletedOrder('token', staffUser, 'order-999');

      expect(mockRealtimeGateway.emitProductOutOfStock).not.toHaveBeenCalled();
    });

    it('should throw BLOCKED BY B1 when RPC is missing from database', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'function fn_consume_inventory_for_order does not exist' },
      });

      await expect(
        service.consumeForCompletedOrder('token', staffUser, 'order-999'),
      ).rejects.toThrow(/BLOCKED BY B1/);
    });

    it('should throw AppException if RPC returns failure code', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: {
          success: false,
          error_code: 'ERR_9001_VALIDATION_FAILED',
          message: 'Tồn kho không đủ để đáp ứng đơn hàng',
        },
        error: null,
      });

      await expect(
        service.consumeForCompletedOrder('token', staffUser, 'order-999'),
      ).rejects.toThrow(AppException);
    });
  });
});
