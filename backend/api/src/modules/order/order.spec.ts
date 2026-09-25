import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { OrderService } from './order.service.js';
import { OrderController } from './order.controller.js';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import { KdsOrdersQueryDto } from './dto/kds-orders-query.dto.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { Reflector } from '@nestjs/core';

describe('OrderService & OrderController Tests', () => {
  let service: OrderService;
  let controller: OrderController;
  let mockSupabase: any;
  let mockRealtimeGateway: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const tableId = '22222222-2222-2222-2222-222222222222';
  const staffUser = {
    sub: 'staff-user',
    tenant_id: tenantId,
    branch_id: 'branch-1',
    role_app: 'STAFF' as const,
  };
  const ownerUser = {
    sub: 'owner-user',
    tenant_id: tenantId,
    branch_id: 'branch-1',
    role_app: 'OWNER' as const,
  };
  const customerUser = {
    sub: 'customer-auth-1',
    tenant_id: tenantId,
    branch_id: undefined,
    role_app: 'CUSTOMER' as const,
  };

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    };

    const mockSupabaseService: any = {
      forUser: () => mockSupabase,
      admin: () => mockSupabase,
    };

    mockRealtimeGateway = {
      emitKdsNewTicket: vi.fn(),
      emitKdsItemStatusChanged: vi.fn(),
    };

    const mockWalletService: any = {};
    const mockCoffeePassService: any = {};

    service = new OrderService(
      mockSupabaseService,
      mockRealtimeGateway,
      mockWalletService,
      mockCoffeePassService,
    );

    controller = new OrderController(service);
  });

  it('(Scenario 10) should have OWNER role metadata configured on GET /orders/:id endpoint', () => {
    const reflector = new Reflector();
    const roles = reflector.get<string[]>('roles', controller.getOrder);
    expect(roles).toBeDefined();
    expect(roles).toContain('OWNER');
    expect(roles).toContain('STAFF');
    expect(roles).toContain('CUSTOMER');
  });

  it('should allow OWNER to retrieve order details via getOrder', async () => {
    const getOrderQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'order-123', order_items: [] },
        error: null,
      }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'orders') return getOrderQuery;
      return {};
    });

    const result = await service.getOrder(ownerUser, 'token', 'order-123');
    expect(result.order.id).toBe('order-123');
  });

  it('(Scenario 14) should call atomic RPC fn_create_order to apply deposit and prevent double credit', async () => {
    mockSupabase.rpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        order_id: 'order-created-1',
        order_code: 'ORD-XYZ123',
        deposit_applied: 50000,
      },
      error: null,
    });

    const result = await service.createOrder(staffUser, 'token', {
      table_id: tableId,
      reservation_code: 'RES_XYZ123',
    });

    expect(result.order_id).toBe('order-created-1');
    expect(result.deposit_applied).toBe(50000);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('fn_create_order', expect.objectContaining({
      p_tenant_id: tenantId,
      p_branch_id: 'branch-1',
      p_table_id: tableId,
      p_reservation_code: 'RES_XYZ123',
      p_order_type: 'DINE_IN',
      p_shift_id: null,
    }));
  });

  it('should pass TAKEAWAY RPC arguments with p_table_id null even if table_id is provided in dto', async () => {
    mockSupabase.rpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        order_id: 'order-takeaway-1',
        order_code: 'ORD-TAKEAWAY',
        deposit_applied: 0,
      },
      error: null,
    });

    const result = await service.createOrder(staffUser, 'token', {
      table_id: tableId,
      order_type: 'TAKEAWAY',
    });

    expect(result.order_id).toBe('order-takeaway-1');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('fn_create_order', expect.objectContaining({
      p_tenant_id: tenantId,
      p_branch_id: 'branch-1',
      p_table_id: null,
      p_order_type: 'TAKEAWAY',
      p_shift_id: null,
    }));
  });

  it('links a customer-created order to the tenant-scoped customer profile', async () => {
    mockSupabase.rpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        order_id: 'order-customer-1',
        order_code: 'ORD-CUSTOMER',
        deposit_applied: 0,
      },
      error: null,
    });

    const customerQuery: any = {};
    customerQuery.select = vi.fn(() => customerQuery);
    customerQuery.eq = vi.fn(() => customerQuery);
    customerQuery.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'customer-profile-1' },
      error: null,
    });

    const orderQuery: any = {};
    orderQuery.update = vi.fn(() => orderQuery);
    orderQuery.eq = vi.fn(() => orderQuery);
    orderQuery.select = vi.fn(() => orderQuery);
    orderQuery.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'order-customer-1' },
      error: null,
    });

    const branchQuery: any = {};
    branchQuery.select = vi.fn(() => branchQuery);
    branchQuery.eq = vi.fn(() => branchQuery);
    branchQuery.limit = vi.fn(() => branchQuery);
    branchQuery.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'branch-1' },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'customers') return customerQuery;
      if (table === 'orders') return orderQuery;
      if (table === 'branches') return branchQuery;
      return {};
    });

    const result = await service.createOrder(customerUser, 'token', { order_type: 'TAKEAWAY' });

    expect(customerQuery.eq).toHaveBeenCalledWith('tenant_id', tenantId);
    expect(orderQuery.update).toHaveBeenCalledWith({ customer_id: 'customer-profile-1' });
    expect(result.order_id).toBe('order-customer-1');
  });

  it('should pass DELIVERY RPC arguments with p_table_id null', async () => {
    mockSupabase.rpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        order_id: 'order-delivery-1',
        order_code: 'ORD-DELIVERY',
        deposit_applied: 0,
      },
      error: null,
    });

    const result = await service.createOrder(staffUser, 'token', {
      order_type: 'DELIVERY',
    });

    expect(result.order_id).toBe('order-delivery-1');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('fn_create_order', expect.objectContaining({
      p_tenant_id: tenantId,
      p_branch_id: 'branch-1',
      p_table_id: null,
      p_order_type: 'DELIVERY',
      p_shift_id: null,
    }));
  });

  it('(Scenario 14 - Double credit check) should reject creating order if deposit was already credited to another order', async () => {
    mockSupabase.rpc = vi.fn().mockResolvedValue({
      data: {
        success: false,
        error_code: 'ERR_3003_DEPOSIT_ALREADY_CLAIMED',
        message: 'Tiền cọc đặt bàn này đã được khấu trừ cho đơn hàng khác',
      },
      error: null,
    });

    await expect(
      service.createOrder(staffUser, 'token', {
        table_id: tableId,
        reservation_code: 'RES_XYZ123',
      })
    ).rejects.toThrow(AppException);

    try {
      await service.createOrder(staffUser, 'token', {
        table_id: tableId,
        reservation_code: 'RES_XYZ123',
      });
    } catch (err: any) {
      expect(err.code).toBe('ERR_3003_DEPOSIT_ALREADY_CLAIMED');
    }
  });

  describe('OrderService.payOrder', () => {
    it('applies a tenant-scoped customer voucher and marks it used after payment', async () => {
      const userOrderQuery: any = {};
      userOrderQuery.select = vi.fn(() => userOrderQuery);
      userOrderQuery.eq = vi.fn(() => userOrderQuery);
      userOrderQuery.single = vi.fn().mockResolvedValue({
        data: {
          id: 'order-1',
          status: 'IN_PROGRESS',
          table_id: null,
          subtotal: 32000,
          final_amount: 32000,
          branch_id: 'branch-1',
          shift_id: 'shift-1',
        },
        error: null,
      });
      userOrderQuery.update = vi.fn(() => userOrderQuery);

      const customerQuery: any = {};
      customerQuery.select = vi.fn(() => customerQuery);
      customerQuery.eq = vi.fn(() => customerQuery);
      customerQuery.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'customer-1' },
        error: null,
      });

      const voucherQuery: any = {};
      voucherQuery.select = vi.fn(() => voucherQuery);
      voucherQuery.eq = vi.fn(() => voucherQuery);
      voucherQuery.maybeSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'voucher-1',
          customer_id: 'customer-1',
          discount_percent: 7,
          is_used: false,
          expires_at: null,
        },
        error: null,
      });
      voucherQuery.update = vi.fn(() => voucherQuery);

      const adminOrderQuery: any = {};
      adminOrderQuery.update = vi.fn(() => adminOrderQuery);
      adminOrderQuery.eq = vi.fn(() => adminOrderQuery);

      const shiftQuery: any = {};
      shiftQuery.select = vi.fn(() => shiftQuery);
      shiftQuery.eq = vi.fn(() => shiftQuery);
      shiftQuery.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'shift-1' }, error: null });

      const auditQuery = { insert: vi.fn().mockResolvedValue({ error: null }) };
      const userClient = { from: vi.fn(() => userOrderQuery) };
      const adminClient = {
        from: vi.fn((table: string) => {
          if (table === 'customers') return customerQuery;
          if (table === 'customer_vouchers') return voucherQuery;
          if (table === 'orders') return adminOrderQuery;
          if (table === 'shifts') return shiftQuery;
          if (table === 'audit_logs') return auditQuery;
          return {};
        }),
      };
      const voucherService = new OrderService(
        { forUser: () => userClient, admin: () => adminClient } as any,
        mockRealtimeGateway,
        {} as any,
        {} as any,
      );

      const result = await voucherService.payOrder(customerUser, 'token', 'order-1', {
        payment_method: 'VIETQR',
        voucher_id: 'voucher-1',
      });

      expect(adminOrderQuery.update).toHaveBeenCalledWith({
        discount_amount: 2240,
        final_amount: 29760,
      });
      expect(voucherQuery.update).toHaveBeenCalledWith({ is_used: true });
      expect(result.message).toBe('Đã thanh toán thành công');
    });

    it('should reject payOrder with COFFEE_PASS if subscription_id or totp_code is missing', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'order-1', status: 'IN_PROGRESS', table_id: tableId },
          error: null,
        }),
      });

      await expect(
        service.payOrder(staffUser, 'token', 'order-1', {
          payment_method: 'COFFEE_PASS',
        })
      ).rejects.toThrow(AppException);

      try {
        await service.payOrder(staffUser, 'token', 'order-1', {
          payment_method: 'COFFEE_PASS',
        });
      } catch (err: any) {
        expect(err.code).toBe('ERR_9001_VALIDATION_FAILED');
      }
    });

    it('should execute coffeePassService.redeemForOrder and mark order COMPLETED for valid COFFEE_PASS', async () => {
      const orderQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'order-1', status: 'IN_PROGRESS', table_id: tableId },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      };

      const tablesQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') return orderQuery;
        if (table === 'tables') return tablesQuery;
        if (table === 'audit_logs') return { insert: vi.fn().mockResolvedValue({ error: null }) };
        return {};
      });

      const mockCoffeePass = (service as any).coffeePassService;
      mockCoffeePass.redeemForOrder = vi.fn().mockResolvedValue({ message: 'Redeemed' });

      const result = await service.payOrder(staffUser, 'token', 'order-1', {
        payment_method: 'COFFEE_PASS',
        coffee_pass_subscription_id: 'sub-uuid-1',
        totp_code: '123456',
      });

      expect(mockCoffeePass.redeemForOrder).toHaveBeenCalledWith(
        staffUser,
        'token',
        'sub-uuid-1',
        '123456',
        'order-1'
      );
      expect(result.message).toBe('Đã thanh toán thành công');
    });

    it('should invoke atomic RPC fn_pay_order_wallet when payment_method is WALLET', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'order-1', status: 'IN_PROGRESS', table_id: tableId },
          error: null,
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Thanh toán ví thành công' },
        error: null,
      });

      const result = await service.payOrder(staffUser, 'token', 'order-1', {
        payment_method: 'WALLET',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('fn_pay_order_wallet', {
        p_order_id: 'order-1',
        p_auth_user_id: staffUser.sub,
        p_tenant_id: staffUser.tenant_id,
      });
      expect(result.message).toBe('Đã thanh toán thành công');
    });
  });

  describe('PATCH /orders/:id/items/:itemId/kitchen-status Regression Tests', () => {
    const orderId = 'order-kds-1';
    const itemId = 'item-kds-1';

    it('should reject if order not found (ERR_4001_ORDER_NOT_FOUND)', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          };
        }
        return {};
      });

      await expect(
        service.updateKitchenStatus(staffUser, 'token', orderId, itemId, { kitchen_status: 'PREPARING' })
      ).rejects.toThrow(AppException);

      try {
        await service.updateKitchenStatus(staffUser, 'token', orderId, itemId, { kitchen_status: 'PREPARING' });
      } catch (err: any) {
        expect(err.code).toBe('ERR_4001_ORDER_NOT_FOUND');
      }
    });

    it('should reject if order is already COMPLETED or CANCELLED (ERR_4002_ORDER_ALREADY_COMPLETED)', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: orderId, branch_id: 'branch-1', status: 'COMPLETED' },
              error: null,
            }),
          };
        }
        return {};
      });

      await expect(
        service.updateKitchenStatus(staffUser, 'token', orderId, itemId, { kitchen_status: 'PREPARING' })
      ).rejects.toThrow(AppException);

      try {
        await service.updateKitchenStatus(staffUser, 'token', orderId, itemId, { kitchen_status: 'PREPARING' });
      } catch (err: any) {
        expect(err.code).toBe('ERR_4002_ORDER_ALREADY_COMPLETED');
      }
    });

    it('should reject if order item does not exist in order (ERR_9001_VALIDATION_FAILED)', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: orderId, branch_id: 'branch-1', status: 'IN_PROGRESS' },
              error: null,
            }),
          };
        }
        if (table === 'order_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Item not found' } }),
          };
        }
        return {};
      });

      try {
        await service.updateKitchenStatus(staffUser, 'token', orderId, itemId, { kitchen_status: 'PREPARING' });
      } catch (err: any) {
        expect(err.code).toBe('ERR_9001_VALIDATION_FAILED');
      }
    });

    it('should reject invalid kitchen status transitions (e.g. QUEUED -> READY, or SERVED -> QUEUED)', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: orderId, branch_id: 'branch-1', status: 'IN_PROGRESS' },
              error: null,
            }),
          };
        }
        if (table === 'order_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: itemId, kitchen_status: 'QUEUED' },
              error: null,
            }),
          };
        }
        return {};
      });

      try {
        await service.updateKitchenStatus(staffUser, 'token', orderId, itemId, { kitchen_status: 'READY' });
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err.code).toBe('ERR_9001_VALIDATION_FAILED');
        expect(err.message).toContain('Chuyển trạng thái bếp không hợp lệ');
      }
    });

    it('should succeed idempotently when target status equals current status', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: orderId, branch_id: 'branch-1', status: 'IN_PROGRESS' },
              error: null,
            }),
          };
        }
        if (table === 'order_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: itemId, kitchen_status: 'PREPARING' },
              error: null,
            }),
          };
        }
        return {};
      });

      const res = await service.updateKitchenStatus(staffUser, 'token', orderId, itemId, { kitchen_status: 'PREPARING' });
      expect(res.message).toBe('Đã cập nhật trạng thái bếp');
    });

    it('should update kitchen status and emit realtime event on valid transition (QUEUED -> PREPARING)', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: orderId, branch_id: 'branch-1', status: 'IN_PROGRESS' },
              error: null,
            }),
          };
        }
        if (table === 'order_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: itemId, kitchen_status: 'QUEUED' },
              error: null,
            }),
            update: updateMock,
          };
        }
        return {};
      });

      const res = await service.updateKitchenStatus(staffUser, 'token', orderId, itemId, { kitchen_status: 'PREPARING' });
      expect(res.message).toBe('Đã cập nhật trạng thái bếp');
      expect(updateMock).toHaveBeenCalledWith({ kitchen_status: 'PREPARING' });
      expect(mockRealtimeGateway.emitKdsItemStatusChanged).toHaveBeenCalledWith('branch-1', {
        order_item_id: itemId,
        kitchen_status: 'PREPARING',
      });
    });
  });

  describe('GET /orders & GET /orders/kds Controller & Service Tests', () => {
    const customerUser = {
      sub: 'customer-auth-id',
      tenant_id: tenantId,
      branch_id: null,
      role_app: 'CUSTOMER' as const,
    };

    it('should have correct role metadata on GET /orders (STAFF, CUSTOMER, OWNER)', () => {
      const reflector = new Reflector();
      const roles = reflector.get<string[]>('roles', controller.listOrders);
      expect(roles).toBeDefined();
      expect(roles).toContain('STAFF');
      expect(roles).toContain('OWNER');
      expect(roles).toContain('CUSTOMER');
    });

    it('should have correct role metadata on GET /orders/kds (STAFF, OWNER)', () => {
      const reflector = new Reflector();
      const roles = reflector.get<string[]>('roles', controller.getKdsSnapshot);
      expect(roles).toBeDefined();
      expect(roles).toContain('STAFF');
      expect(roles).toContain('OWNER');
      expect(roles).not.toContain('CUSTOMER');
    });

    it('should ensure getKdsSnapshot and listOrders route handlers exist and delegate properly', async () => {
      const spyList = vi.spyOn(service, 'listOrders').mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20 },
      });
      const spyKds = vi.spyOn(service, 'getKdsSnapshot').mockResolvedValue([]);

      await controller.listOrders(staffUser, 'token', { page: 1, limit: 20 });
      expect(spyList).toHaveBeenCalled();

      await controller.getKdsSnapshot(staffUser, 'token', { branch_id: 'branch-1' });
      expect(spyKds).toHaveBeenCalled();
    });

    describe('OrderService.listOrders', () => {
      it('should apply pagination and tenant isolation for OWNER', async () => {
        const mockData = [
          { id: 'ord-1', tenant_id: tenantId, order_code: 'ORD-1', order_items: [] },
          { id: 'ord-2', tenant_id: tenantId, order_code: 'ORD-2', order_items: [] },
        ];

        const queryBuilder: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: mockData, count: 2, error: null }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'orders') return queryBuilder;
          return {};
        });

        const result = await service.listOrders(ownerUser, 'token', { page: 1, limit: 10 });

        expect(queryBuilder.select).toHaveBeenCalledWith('*, order_items(*)', { count: 'exact' });
        expect(queryBuilder.eq).toHaveBeenCalledWith('tenant_id', tenantId);
        expect(queryBuilder.range).toHaveBeenCalledWith(0, 9);
        expect(result.data).toHaveLength(2);
        expect(result.meta).toEqual({ total: 2, page: 1, limit: 10 });
      });

      it('should scope orders by customer_id for CUSTOMER role', async () => {
        const customerQuery: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'cust-real-id' }, error: null }),
        };

        const ordersQuery: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: [{ id: 'ord-c1', customer_id: 'cust-real-id', order_items: [] }],
            count: 1,
            error: null,
          }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'customers') return customerQuery;
          if (table === 'orders') return ordersQuery;
          return {};
        });

        const result = await service.listOrders(customerUser, 'token', { page: 1, limit: 20 });

        expect(customerQuery.eq).toHaveBeenCalledWith('auth_user_id', 'customer-auth-id');
        expect(customerQuery.eq).toHaveBeenCalledWith('tenant_id', tenantId);
        expect(ordersQuery.eq).toHaveBeenCalledWith('customer_id', 'cust-real-id');
        expect(result.data).toHaveLength(1);
        expect(result.meta.total).toBe(1);
      });

      it('should return empty list if CUSTOMER profile is not found', async () => {
        const customerQuery: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'customers') return customerQuery;
          return {};
        });

        const result = await service.listOrders(customerUser, 'token', { page: 1, limit: 20 });
        expect(result.data).toEqual([]);
        expect(result.meta.total).toBe(0);
      });

      it('should scope orders by branch_id for STAFF and reject cross-branch query', async () => {
        // Staff querying own branch
        const ordersQuery: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'orders') return ordersQuery;
          return {};
        });

        await service.listOrders(staffUser, 'token', { branch_id: 'branch-1' });
        expect(ordersQuery.eq).toHaveBeenCalledWith('branch_id', 'branch-1');

        // Staff querying cross branch
        await expect(
          service.listOrders(staffUser, 'token', { branch_id: 'other-branch' })
        ).rejects.toThrow(AppException);

        try {
          await service.listOrders(staffUser, 'token', { branch_id: 'other-branch' });
        } catch (err: any) {
          expect(err.code).toBe('ERR_1003_TENANT_MISMATCH');
        }
      });

      it('should reject staff without branch_id with ERR_1001_UNAUTHORIZED in listOrders', async () => {
        const unassignedStaff = {
          sub: 'staff-unassigned',
          tenant_id: tenantId,
          branch_id: null,
          role_app: 'STAFF' as const,
        };

        await expect(
          service.listOrders(unassignedStaff as any, 'token', { branch_id: 'branch-1' })
        ).rejects.toThrow(AppException);

        try {
          await service.listOrders(unassignedStaff as any, 'token', { branch_id: 'branch-1' });
        } catch (err: any) {
          expect(err.code).toBe('ERR_1001_UNAUTHORIZED');
        }
      });

      it('should filter by status and order_type when provided', async () => {
        const ordersQuery: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'orders') return ordersQuery;
          return {};
        });

        await service.listOrders(ownerUser, 'token', {
          status: 'COMPLETED',
          order_type: 'TAKEAWAY',
        });

        expect(ordersQuery.eq).toHaveBeenCalledWith('status', 'COMPLETED');
        expect(ordersQuery.eq).toHaveBeenCalledWith('order_type', 'TAKEAWAY');
      });

      it('should throw AppException when database query fails in listOrders', async () => {
        const ordersQuery: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: null, count: null, error: { message: 'DB connection error' } }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'orders') return ordersQuery;
          return {};
        });

        await expect(service.listOrders(ownerUser, 'token', {})).rejects.toThrow(AppException);
      });
    });

    describe('OrderService.getKdsSnapshot', () => {
      it('should validate branch_id is present and reject missing branch_id', async () => {
        const ownerWithoutBranch = {
          sub: 'owner-2',
          tenant_id: tenantId,
          role_app: 'OWNER' as const,
        };

        await expect(
          service.getKdsSnapshot(ownerWithoutBranch as any, 'token', {})
        ).rejects.toThrow(AppException);

        try {
          await service.getKdsSnapshot(ownerWithoutBranch as any, 'token', {});
        } catch (err: any) {
          expect(err.code).toBe('ERR_9001_VALIDATION_FAILED');
        }
      });

      it('should reject staff querying a different branch_id than assigned', async () => {
        await expect(
          service.getKdsSnapshot(staffUser, 'token', { branch_id: 'branch-other' })
        ).rejects.toThrow(AppException);

        try {
          await service.getKdsSnapshot(staffUser, 'token', { branch_id: 'branch-other' });
        } catch (err: any) {
          expect(err.code).toBe('ERR_1003_TENANT_MISMATCH');
        }
      });

      it('should reject staff without branch_id with ERR_1001_UNAUTHORIZED in getKdsSnapshot', async () => {
        const unassignedStaff = {
          sub: 'staff-unassigned',
          tenant_id: tenantId,
          branch_id: null,
          role_app: 'STAFF' as const,
        };

        await expect(
          service.getKdsSnapshot(unassignedStaff as any, 'token', { branch_id: 'branch-1' })
        ).rejects.toThrow(AppException);

        try {
          await service.getKdsSnapshot(unassignedStaff as any, 'token', { branch_id: 'branch-1' });
        } catch (err: any) {
          expect(err.code).toBe('ERR_1001_UNAUTHORIZED');
        }
      });

      it('should retrieve active orders and map items to KDS format', async () => {
        const mockOrders = [
          {
            id: 'ord-101',
            order_code: 'ORD-101',
            table_id: 'tbl-1',
            order_type: 'DINE_IN',
            status: 'IN_PROGRESS',
            created_at: '2026-09-14T10:00:00.000Z',
            tables: { table_code: 'B01' },
            order_items: [
              {
                id: 'item-1',
                product_name: 'Cà phê đen',
                quantity: 2,
                modifiers: [{ name: 'Ít đường' }],
                kitchen_status: 'QUEUED',
                created_at: '2026-09-14T10:00:10.000Z',
                products: { categories: { kitchen_station: 'BAR' } },
              },
              {
                id: 'item-2',
                product_name: 'Bánh mì bò kho',
                quantity: 1,
                modifiers: [],
                kitchen_status: 'PREPARING',
                created_at: '2026-09-14T10:00:20.000Z',
                products: { categories: { kitchen_station: 'KITCHEN' } },
              },
              {
                id: 'item-3',
                product_name: 'Nước lọc',
                quantity: 1,
                modifiers: [],
                kitchen_status: 'SERVED', // Should be excluded by default
                created_at: '2026-09-14T10:00:05.000Z',
                products: { categories: { kitchen_station: 'BAR' } },
              },
            ],
          },
        ];

        const kdsQuery: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'orders') return kdsQuery;
          return {};
        });

        const items = await service.getKdsSnapshot(staffUser, 'token', { branch_id: 'branch-1' });

        expect(kdsQuery.eq).toHaveBeenCalledWith('tenant_id', tenantId);
        expect(kdsQuery.eq).toHaveBeenCalledWith('branch_id', 'branch-1');
        expect(kdsQuery.in).toHaveBeenCalledWith('status', ['PENDING', 'IN_PROGRESS']);

        // Default active: QUEUED and PREPARING included, SERVED excluded
        expect(items).toHaveLength(2);

        expect(items[0]).toEqual({
          order_id: 'ord-101',
          order_code: 'ORD-101',
          table_id: 'tbl-1',
          table_code: 'B01',
          order_type: 'DINE_IN',
          created_at: '2026-09-14T10:00:10.000Z',
          order_item_id: 'item-1',
          product_name: 'Cà phê đen',
          quantity: 2,
          modifiers: [{ name: 'Ít đường' }],
          kitchen_status: 'QUEUED',
          station: 'BAR',
        });

        expect(items[1]).toEqual({
          order_id: 'ord-101',
          order_code: 'ORD-101',
          table_id: 'tbl-1',
          table_code: 'B01',
          order_type: 'DINE_IN',
          created_at: '2026-09-14T10:00:20.000Z',
          order_item_id: 'item-2',
          product_name: 'Bánh mì bò kho',
          quantity: 1,
          modifiers: [],
          kitchen_status: 'PREPARING',
          station: 'KITCHEN',
        });
      });

      it('should filter items by station when station is specified', async () => {
        const mockOrders = [
          {
            id: 'ord-102',
            order_code: 'ORD-102',
            table_id: null,
            order_type: 'TAKEAWAY',
            status: 'PENDING',
            created_at: '2026-09-14T10:05:00.000Z',
            tables: null,
            order_items: [
              {
                id: 'item-10',
                product_name: 'Trà sen vàng',
                quantity: 1,
                modifiers: [],
                kitchen_status: 'QUEUED',
                products: { categories: { kitchen_station: 'BAR' } },
              },
              {
                id: 'item-20',
                product_name: 'Khoai tây chiên',
                quantity: 1,
                modifiers: [],
                kitchen_status: 'QUEUED',
                products: { categories: { kitchen_station: 'KITCHEN' } },
              },
            ],
          },
        ];

        const kdsQuery: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'orders') return kdsQuery;
          return {};
        });

        // Query BAR only
        const barItems = await service.getKdsSnapshot(staffUser, 'token', {
          branch_id: 'branch-1',
          station: 'BAR',
        });
        expect(barItems).toHaveLength(1);
        expect(barItems[0].station).toBe('BAR');
        expect(barItems[0].product_name).toBe('Trà sen vàng');
        expect(barItems[0].table_code).toBeNull();

        // Query KITCHEN only
        const kitchenItems = await service.getKdsSnapshot(staffUser, 'token', {
          branch_id: 'branch-1',
          station: 'KITCHEN',
        });
        expect(kitchenItems).toHaveLength(1);
        expect(kitchenItems[0].station).toBe('KITCHEN');
        expect(kitchenItems[0].product_name).toBe('Khoai tây chiên');
      });

      it('should filter items by status when status is specified', async () => {
        const mockOrders = [
          {
            id: 'ord-103',
            order_code: 'ORD-103',
            table_id: 'tbl-3',
            order_type: 'DINE_IN',
            status: 'IN_PROGRESS',
            created_at: '2026-09-14T10:10:00.000Z',
            tables: { table_code: 'T3' },
            order_items: [
              {
                id: 'item-a',
                product_name: 'Món A',
                quantity: 1,
                kitchen_status: 'QUEUED',
                products: { categories: { kitchen_station: 'KITCHEN' } },
              },
              {
                id: 'item-b',
                product_name: 'Món B',
                quantity: 1,
                kitchen_status: 'READY',
                products: { categories: { kitchen_station: 'KITCHEN' } },
              },
            ],
          },
        ];

        const kdsQuery: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'orders') return kdsQuery;
          return {};
        });

        const readyItems = await service.getKdsSnapshot(staffUser, 'token', {
          branch_id: 'branch-1',
          status: 'READY',
        });
        expect(readyItems).toHaveLength(1);
        expect(readyItems[0].kitchen_status).toBe('READY');
      });

      it('should throw AppException when database query fails in getKdsSnapshot', async () => {
        const kdsQuery: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database failed' } }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'orders') return kdsQuery;
          return {};
        });

        await expect(
          service.getKdsSnapshot(staffUser, 'token', { branch_id: 'branch-1' })
        ).rejects.toThrow(AppException);
      });

      it('should return empty array when no orders exist in KDS', async () => {
        const kdsQuery: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'orders') return kdsQuery;
          return {};
        });

        const result = await service.getKdsSnapshot(staffUser, 'token', { branch_id: 'branch-1' });
        expect(result).toEqual([]);
      });
    });
  });

  describe('ListOrdersQueryDto & KdsOrdersQueryDto Validation Tests', () => {
    describe('ListOrdersQueryDto', () => {
      it('should validate valid query parameters', async () => {
        const dto = plainToInstance(ListOrdersQueryDto, {
          page: 2,
          limit: 50,
          branch_id: '11111111-1111-1111-1111-111111111111',
          status: 'IN_PROGRESS',
          order_type: 'DINE_IN',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should reject page < 1 and limit < 1 or limit > 100', async () => {
        const dtoPage = plainToInstance(ListOrdersQueryDto, { page: 0 });
        const errorsPage = await validate(dtoPage);
        expect(errorsPage.some(e => e.property === 'page')).toBe(true);

        const dtoLimitLow = plainToInstance(ListOrdersQueryDto, { limit: 0 });
        const errorsLimitLow = await validate(dtoLimitLow);
        expect(errorsLimitLow.some(e => e.property === 'limit')).toBe(true);

        const dtoLimitHigh = plainToInstance(ListOrdersQueryDto, { limit: 101 });
        const errorsLimitHigh = await validate(dtoLimitHigh);
        expect(errorsLimitHigh.some(e => e.property === 'limit')).toBe(true);
      });

      it('should reject invalid branch_id, status, and order_type', async () => {
        const dto = plainToInstance(ListOrdersQueryDto, {
          branch_id: 'not-a-valid-uuid',
          status: 'INVALID_STATUS',
          order_type: 'INVALID_TYPE',
        });
        const errors = await validate(dto);
        expect(errors.some(e => e.property === 'branch_id')).toBe(true);
        expect(errors.some(e => e.property === 'status')).toBe(true);
        expect(errors.some(e => e.property === 'order_type')).toBe(true);
      });
    });

    describe('KdsOrdersQueryDto', () => {
      it('should validate valid KDS query parameters', async () => {
        const dto = plainToInstance(KdsOrdersQueryDto, {
          branch_id: '11111111-1111-1111-1111-111111111111',
          station: 'BAR',
          status: 'QUEUED',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should reject invalid station, status, or branch_id', async () => {
        const dto = plainToInstance(KdsOrdersQueryDto, {
          branch_id: 'not-uuid',
          station: 'INVALID_STATION' as any,
          status: 'COMPLETED',
        });
        const errors = await validate(dto);
        expect(errors.some(e => e.property === 'branch_id')).toBe(true);
        expect(errors.some(e => e.property === 'station')).toBe(true);
        expect(errors.some(e => e.property === 'status')).toBe(true);
      });
    });
  });

  describe('Shift Integration with Order Flow', () => {
    it('should delegate shift mapping atomically to RPC fn_create_order without secondary order update', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: {
          success: true,
          order_id: 'order-shift-mapped',
          order_code: 'ORD-S1',
        },
        error: null,
      });

      const orderUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') return orderUpdateQuery;
        return {};
      });

      await service.createOrder(staffUser, 'token', {
        table_id: tableId,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('fn_create_order', expect.objectContaining({
        p_tenant_id: tenantId,
        p_branch_id: 'branch-1',
        p_table_id: tableId,
        p_order_type: 'DINE_IN',
        p_shift_id: null,
      }));
      expect(orderUpdateQuery.update).not.toHaveBeenCalled();
    });

    it('should reject payOrder if no open shift exists for the branch', async () => {
      const orderQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'order-1', status: 'IN_PROGRESS', branch_id: 'branch-1' },
          error: null,
        }),
      };

      const shiftQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null, // No open shift
          error: null,
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') return orderQuery;
        if (table === 'shifts') return shiftQuery;
        return {};
      });

      await expect(
        service.payOrder(staffUser, 'token', 'order-1', {
          payment_method: 'CASH',
        }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('B2 Inventory Integration on Completed Order', () => {
    let mockInventoryService: any;
    let integratedOrderService: OrderService;

    beforeEach(() => {
      mockInventoryService = {
        consumeForCompletedOrder: vi.fn().mockResolvedValue({ success: true }),
      };
      const mockSupabaseService: any = {
        forUser: () => mockSupabase,
        admin: () => mockSupabase,
      };
      integratedOrderService = new OrderService(
        mockSupabaseService,
        mockRealtimeGateway,
        {} as any,
        {} as any,
        mockInventoryService,
      );
    });

    it('should trigger inventory consumption when order is successfully paid with CASH', async () => {
      const orderQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'order-1', status: 'IN_PROGRESS', table_id: tableId, branch_id: staffUser.branch_id, tenant_id: tenantId },
          error: null,
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
      const shiftQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'shift-1', status: 'OPEN' },
          error: null,
        }),
      };
      const updateOrderQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const updateTableQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const insertAuditQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') return orderQuery;
        if (table === 'shifts') return shiftQuery;
        if (table === 'tables') return updateTableQuery;
        if (table === 'audit_logs') return insertAuditQuery;
        return updateOrderQuery;
      });

      const result = await integratedOrderService.payOrder(staffUser, 'token', 'order-1', {
        payment_method: 'CASH',
      });

      expect(result.message).toBe('Đã thanh toán thành công');
      expect(mockInventoryService.consumeForCompletedOrder).toHaveBeenCalledWith(
        'token',
        staffUser,
        'order-1',
      );
    });

    it('should trigger inventory consumption when order is successfully paid with WALLET', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'order-1', status: 'IN_PROGRESS', table_id: tableId },
          error: null,
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Thanh toán ví thành công' },
        error: null,
      });

      const result = await integratedOrderService.payOrder(staffUser, 'token', 'order-1', {
        payment_method: 'WALLET',
      });

      expect(result.message).toBe('Đã thanh toán thành công');
      expect(mockInventoryService.consumeForCompletedOrder).toHaveBeenCalledWith(
        'token',
        staffUser,
        'order-1',
      );
    });

    it('should NOT trigger inventory consumption if payOrder fails (e.g. order already completed)', async () => {
      const orderQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'order-1', status: 'COMPLETED', table_id: tableId, branch_id: staffUser.branch_id, tenant_id: tenantId },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(orderQuery);

      await expect(
        integratedOrderService.payOrder(staffUser, 'token', 'order-1', {
          payment_method: 'CASH',
        }),
      ).rejects.toThrow(AppException);

      expect(mockInventoryService.consumeForCompletedOrder).not.toHaveBeenCalled();
    });

    it('should NOT trigger inventory consumption if shift is not open for cash payment', async () => {
      const orderQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'order-1', status: 'IN_PROGRESS', table_id: tableId, branch_id: staffUser.branch_id, tenant_id: tenantId },
          error: null,
        }),
      };
      const shiftQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'orders') return orderQuery;
        if (table === 'shifts') return shiftQuery;
        return {};
      });

      await expect(
        integratedOrderService.payOrder(staffUser, 'token', 'order-1', {
          payment_method: 'CASH',
        }),
      ).rejects.toThrow(AppException);

      expect(mockInventoryService.consumeForCompletedOrder).not.toHaveBeenCalled();
    });
  });
});
