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
});
