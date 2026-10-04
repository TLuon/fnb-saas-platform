import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupOrderService } from './group-order.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';

describe('GroupOrderService - Confirmation & Rollback Tests', () => {
  let service: GroupOrderService;
  let mockSupabase: any;
  let mockRedisClient: any;
  let mockRealtimeGateway: any;
  let mockOrderService: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const tableId = '22222222-2222-2222-2222-222222222222';
  const user = {
    sub: 'user-123',
    tenant_id: tenantId,
    branch_id: 'branch-1',
    role_app: 'CUSTOMER' as const,
  };

  beforeEach(() => {
    mockRedisClient = {
      watch: vi.fn().mockResolvedValue('OK'),
      unwatch: vi.fn().mockResolvedValue('OK'),
      get: vi.fn(),
      del: vi.fn().mockResolvedValue(1),
      setex: vi.fn().mockResolvedValue('OK'),
      multi: vi.fn().mockReturnValue({
        setex: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(['OK']),
      }),
    };

    mockRealtimeGateway = {
      emitGroupOrderCartUpdated: vi.fn(),
    };

    mockOrderService = {
      submitKitchen: vi.fn().mockResolvedValue({ message: 'OK' }),
    };

    mockSupabase = {
      from: vi.fn(),
    };

    const mockSupabaseService: any = {
      forUser: () => mockSupabase,
      admin: () => mockSupabase,
    };

    const mockRedisService: any = {
      getClient: () => mockRedisClient,
    };

    service = new GroupOrderService(
      mockSupabaseService,
      mockRedisService,
      mockRealtimeGateway,
      mockOrderService,
    );
  });

  it('(Scenario 3) should rollback Redis confirmed state when Postgres insert fails', async () => {
    const cart = {
      table_id: tableId,
      confirmed: false,
      cart_items: [
        {
          product_id: 'prod-1',
          product_name: 'Cà phê đen',
          quantity: 2,
          unit_price: 25000,
          modifiers: [],
          added_by_customer_id: 'user-123',
        },
      ],
    };

    mockRedisClient.get.mockResolvedValue(JSON.stringify(cart));

    // Supabase table has order
    const tableQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { current_order_id: 'order-123' },
        error: null,
      }),
    };

    // Supabase order_items insert FAILS (e.g. database constraint failure)
    const orderItemsQuery = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database constraint failure' },
        }),
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'tables') return tableQuery;
      if (table === 'order_items') return orderItemsQuery;
      return {};
    });

    await expect(service.confirmGroupOrder(user, 'token', tableId)).rejects.toThrow(
      AppException
    );

    // Verify Redis rollback: confirmed must be reset to false with 7200 TTL so users can retry
    expect(mockRedisClient.setex).toHaveBeenCalledWith(
      expect.stringContaining(tableId),
      7200,
      expect.stringContaining('"confirmed":false')
    );
  });

  it('(Scenario 4) should succeed and clean up Redis session after successful confirmation', async () => {
    const cart = {
      table_id: tableId,
      confirmed: false,
      cart_items: [
        {
          product_id: 'prod-1',
          product_name: 'Cà phê đen',
          quantity: 2,
          unit_price: 25000,
          modifiers: [],
          added_by_customer_id: 'user-123',
        },
      ],
    };

    mockRedisClient.get.mockResolvedValue(JSON.stringify(cart));

    const tableQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { current_order_id: 'order-123' },
        error: null,
      }),
    };

    const orderItemsQuery = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'item-inserted-1' }],
          error: null,
        }),
      }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ quantity: 2, unit_price: 25000 }],
        error: null,
      }),
    };

    const ordersQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'tables') return tableQuery;
      if (table === 'order_items') return orderItemsQuery;
      if (table === 'orders') return ordersQuery;
      return {};
    });

    const result = await service.confirmGroupOrder(user, 'token', tableId);

    expect(result.message).toBe('Đã chốt order nhóm thành công');
    expect(mockOrderService.submitKitchen).toHaveBeenCalled();
    expect(mockRedisClient.del).toHaveBeenCalled();
    expect(mockRealtimeGateway.emitGroupOrderCartUpdated).toHaveBeenCalled();
  });

  it('(NEW-008 / ISSUE-003) should clean up inserted order_items and restore 7200 TTL when submitKitchen fails', async () => {
    const cart = {
      table_id: tableId,
      confirmed: false,
      cart_items: [
        {
          product_id: 'prod-1',
          product_name: 'Cà phê đen',
          quantity: 2,
          unit_price: 25000,
          modifiers: [],
          added_by_customer_id: 'user-123',
        },
      ],
    };

    mockRedisClient.get.mockResolvedValue(JSON.stringify(cart));

    const tableQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { current_order_id: 'order-123' },
        error: null,
      }),
    };

    const deleteMock = vi.fn().mockReturnThis();
    const inMock = vi.fn().mockResolvedValue({ error: null });
    deleteMock.mockReturnValue({ in: inMock });

    const orderItemsQuery = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'item-inserted-fail' }],
          error: null,
        }),
      }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      delete: deleteMock,
    };

    const ordersQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'tables') return tableQuery;
      if (table === 'order_items') return orderItemsQuery;
      if (table === 'orders') return ordersQuery;
      return {};
    });

    mockOrderService.submitKitchen.mockRejectedValue(
      new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'KDS downstream connection timeout')
    );

    await expect(service.confirmGroupOrder(user, 'token', tableId)).rejects.toThrow(AppException);

    // Verify order_items compensating deletion was performed
    expect(deleteMock).toHaveBeenCalled();
    expect(inMock).toHaveBeenCalledWith('id', ['item-inserted-fail']);

    // Verify Redis rollback was performed with 7200 TTL
    expect(mockRedisClient.setex).toHaveBeenCalledWith(
      expect.stringContaining(tableId),
      7200,
      expect.stringContaining('"confirmed":false')
    );
  });

  it('should block simultaneous confirm requests when Redis transaction detects concurrent modification', async () => {
    const cart = {
      table_id: tableId,
      confirmed: false,
      cart_items: [{ product_id: 'prod-1', quantity: 1, unit_price: 25000 }],
    };

    mockRedisClient.get.mockResolvedValue(JSON.stringify(cart));
    // Simulate transaction conflict where Redis watch detected concurrent modification
    mockRedisClient.multi().exec.mockResolvedValue(null);

    await expect(service.confirmGroupOrder(user, 'token', tableId)).rejects.toThrow(AppException);

    try {
      await service.confirmGroupOrder(user, 'token', tableId);
    } catch (err: any) {
      expect(err.code).toBe('ERR_9002_INTERNAL_SERVER_ERROR');
      expect(err.message).toContain('Có người khác đang thao tác');
    }
  });

  describe('GroupOrderService.joinSession', () => {
    it('should reject joinSession when table is not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      });

      await expect(service.joinSession(user, 'token', { table_id: tableId })).rejects.toThrow(AppException);
      try {
        await service.joinSession(user, 'token', { table_id: tableId });
      } catch (err: any) {
        expect(err.code).toBe('ERR_2001_TABLE_NOT_FOUND');
      }
    });

    it('should reject joinSession when table is not OCCUPIED or has no open order', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: tableId, status: 'AVAILABLE', current_order_id: null },
          error: null,
        }),
      });

      await expect(service.joinSession(user, 'token', { table_id: tableId })).rejects.toThrow(AppException);
      try {
        await service.joinSession(user, 'token', { table_id: tableId });
      } catch (err: any) {
        expect(err.code).toBe('ERR_2002_TABLE_LOCKED');
      }
    });

    it('should reject joinSession when session is already confirmed', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: tableId, status: 'OCCUPIED', current_order_id: 'order-1' },
          error: null,
        }),
      });

      mockRedisClient.get.mockResolvedValue(JSON.stringify({ table_id: tableId, confirmed: true }));

      await expect(service.joinSession(user, 'token', { table_id: tableId })).rejects.toThrow(AppException);
      try {
        await service.joinSession(user, 'token', { table_id: tableId });
      } catch (err: any) {
        expect(err.code).toBe('ERR_5002_SESSION_ALREADY_CONFIRMED');
      }
    });

    it('should create new cart with 7200 TTL when no active session exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: tableId, status: 'OCCUPIED', current_order_id: 'order-1' },
          error: null,
        }),
      });

      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.joinSession(user, 'token', { table_id: tableId });

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `session:${tenantId}:${tableId}`,
        7200,
        expect.stringContaining('"cart_total":0')
      );
      expect(result.session_key).toBe(`session:${tenantId}:${tableId}`);
      expect(result.cart.cart_items).toEqual([]);
    });
  });

  describe('GroupOrderService.getCart', () => {
    it('should throw ERR_5001_SESSION_NOT_FOUND when cart does not exist in Redis', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await expect(service.getCart(user, 'token', tableId)).rejects.toThrow(AppException);
      try {
        await service.getCart(user, 'token', tableId);
      } catch (err: any) {
        expect(err.code).toBe('ERR_5001_SESSION_NOT_FOUND');
      }
    });

    it('should return cart when active session exists', async () => {
      const cart = { table_id: tableId, cart_items: [], cart_total: 0, confirmed: false };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cart));

      const result = await service.getCart(user, 'token', tableId);
      expect(result).toEqual(cart);
    });
  });

  describe('GroupOrderService.addCartItem', () => {
    it('should reject addCartItem when product is inactive or not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'prod-1', is_active: false }, error: null }),
      });

      await expect(
        service.addCartItem(user, 'token', tableId, { product_id: 'prod-1', quantity: 1 })
      ).rejects.toThrow(AppException);
      try {
        await service.addCartItem(user, 'token', tableId, { product_id: 'prod-1', quantity: 1 });
      } catch (err: any) {
        expect(err.code).toBe('ERR_7002_PRODUCT_NOT_FOUND');
      }
    });

    it('should reject addCartItem when session is already confirmed', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'prod-1', name: 'Trà sen', price: 35000, is_active: true }, error: null }),
          };
        }
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'cust-1' }, error: null }),
          };
        }
        return {};
      });

      mockRedisClient.get.mockResolvedValue(JSON.stringify({ table_id: tableId, confirmed: true, cart_items: [] }));

      await expect(
        service.addCartItem(user, 'token', tableId, { product_id: 'prod-1', quantity: 1 })
      ).rejects.toThrow(AppException);
      try {
        await service.addCartItem(user, 'token', tableId, { product_id: 'prod-1', quantity: 1 });
      } catch (err: any) {
        expect(err.code).toBe('ERR_5002_SESSION_ALREADY_CONFIRMED');
      }
    });

    it('should add item successfully, update total, and emit group_order_cart_updated', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'prod-1', name: 'Trà sen', price: 35000, is_active: true }, error: null }),
          };
        }
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'cust-1' }, error: null }),
          };
        }
        return {};
      });

      const initialCart = { table_id: tableId, confirmed: false, cart_items: [], cart_total: 0 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(initialCart));
      mockRedisClient.multi().exec.mockResolvedValue(['OK']);

      const result = await service.addCartItem(user, 'token', tableId, {
        product_id: 'prod-1',
        quantity: 2,
        modifiers: ['ít đường'],
      });

      expect(result.message).toBe('Đã thêm vào giỏ hàng nhóm');
      expect(result.cart.cart_items).toHaveLength(1);
      expect(result.cart.cart_items[0].product_name).toBe('Trà sen');
      expect(result.cart.cart_items[0].quantity).toBe(2);
      expect(result.cart.cart_total).toBe(70000);
      expect(result.cart.cart_items[0].added_by_customer_id).toBe('cust-1');
      expect(mockRealtimeGateway.emitGroupOrderCartUpdated).toHaveBeenCalledWith(
        tenantId,
        tableId,
        expect.objectContaining({ cart_total: 70000 })
      );
    });
  });
});
