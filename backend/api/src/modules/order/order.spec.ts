import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from './order.service.js';
import { OrderController } from './order.controller.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { Reflector } from '@nestjs/core';

describe('OrderService & OrderController Tests', () => {
  let service: OrderService;
  let controller: OrderController;
  let mockSupabase: any;

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

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    };

    const mockSupabaseService: any = {
      forUser: () => mockSupabase,
      admin: () => mockSupabase,
    };

    const mockRealtimeGateway: any = {
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
});
