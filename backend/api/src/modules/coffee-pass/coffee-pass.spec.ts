import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoffeePassService } from './coffee-pass.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { generateSecret, generate } from 'otplib';

describe('CoffeePassService Tests', () => {
  let service: CoffeePassService;
  let mockSupabaseUser: any;
  let mockSupabaseAdmin: any;
  let mockWalletService: any;
  let mockRedisClient: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const customerId = 'cust-uuid-1';
  const planId = 'plan-uuid-1';
  const subscriptionId = 'sub-uuid-1';

  const customerUser = {
    sub: 'auth-cust-1',
    tenant_id: tenantId,
    branch_id: null,
    role_app: 'CUSTOMER' as const,
  };

  const staffUser = {
    sub: 'auth-staff-1',
    tenant_id: tenantId,
    branch_id: 'branch-1',
    role_app: 'STAFF' as const,
  };

  beforeEach(() => {
    mockSupabaseUser = {
      from: vi.fn(),
    };
    mockSupabaseAdmin = {
      from: vi.fn(),
      rpc: vi.fn(),
    };
    mockWalletService = {
      payWithWallet: vi.fn(),
    };
    mockRedisClient = {
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn(),
      del: vi.fn().mockResolvedValue(1),
    };

    const mockSupabaseService: any = {
      forUser: () => mockSupabaseUser,
      admin: () => mockSupabaseAdmin,
    };

    const mockRedisService: any = {
      getClient: () => mockRedisClient,
    };

    service = new CoffeePassService(
      mockSupabaseService,
      mockWalletService as any,
      mockRedisService as any
    );
  });

  describe('getPlans', () => {
    it('should retrieve coffee pass plans scoped to user tenant_id', async () => {
      const mockPlans = [
        { id: 'p1', name: 'Pass 10 Ly', price: 200000, valid_days: 30, total_redemptions: 10 },
      ];

      const plansQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockPlans, error: null }),
      };

      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'coffee_pass_plans') return plansQuery;
        return {};
      });

      const result = await service.getPlans(customerUser, 'token');

      expect(plansQuery.eq).toHaveBeenCalledWith('tenant_id', tenantId);
      expect(result.plans).toEqual(mockPlans);
    });

    it('should throw AppException if database query fails', async () => {
      mockSupabaseUser.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      });

      await expect(service.getPlans(customerUser, 'token')).rejects.toThrow(AppException);
    });
  });

  describe('subscribe', () => {
    it('should reject when plan does not exist or belongs to another tenant', async () => {
      mockSupabaseUser.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        service.subscribe(customerUser, 'token', { plan_id: planId })
      ).rejects.toThrow(AppException);

      try {
        await service.subscribe(customerUser, 'token', { plan_id: planId });
      } catch (err: any) {
        expect(err.code).toBe('ERR_9001_VALIDATION_FAILED');
      }
    });

    it('should invoke atomic RPC fn_subscribe_coffee_pass and return subscription on success', async () => {
      const mockPlan = {
        id: planId,
        name: 'Gói 10 ly',
        price: 200000,
        valid_days: 30,
        total_redemptions: 10,
      };

      const planQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPlan, error: null }),
      };

      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'coffee_pass_plans') return planQuery;
        return {};
      });

      mockSupabaseAdmin.rpc.mockResolvedValue({
        data: {
          success: true,
          subscription_id: subscriptionId,
          remaining_redemptions: 10,
          expires_at: '2026-10-14T00:00:00.000Z',
        },
        error: null,
      });

      const result = await service.subscribe(customerUser, 'token', { plan_id: planId });

      expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith(
        'fn_subscribe_coffee_pass',
        expect.objectContaining({
          p_auth_user_id: customerUser.sub,
          p_tenant_id: tenantId,
          p_plan_id: planId,
        })
      );
      expect(result.message).toContain('thành công');
      expect(result.subscription.id).toBe(subscriptionId);
      expect(result.subscription.remaining_redemptions).toBe(10);
      expect((result.subscription as any).totp_secret).toBeUndefined(); // Secret not leaked!
    });

    it('should throw AppException when RPC returns failure (e.g. insufficient wallet balance)', async () => {
      const mockPlan = { id: planId, price: 500000, valid_days: 30, total_redemptions: 20 };

      mockSupabaseUser.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPlan, error: null }),
      });

      mockSupabaseAdmin.rpc.mockResolvedValue({
        data: {
          success: false,
          error_code: 'ERR_3003_INSUFFICIENT_WALLET_BALANCE',
          message: 'Số dư ví không đủ để đăng ký gói',
        },
        error: null,
      });

      await expect(
        service.subscribe(customerUser, 'token', { plan_id: planId })
      ).rejects.toThrow(AppException);

      try {
        await service.subscribe(customerUser, 'token', { plan_id: planId });
      } catch (err: any) {
        expect(err.code).toBe('ERR_3003_INSUFFICIENT_WALLET_BALANCE');
      }
    });
  });

  describe('getCurrentCode', () => {
    it('should throw ERR_3004_COFFEE_PASS_EXPIRED if subscription is expired or 0 redemptions left', async () => {
      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: customerId }, error: null }),
          };
        }
        if (table === 'coffee_pass_subscriptions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                totp_secret: generateSecret(),
                remaining_redemptions: 0,
                expires_at: '2026-10-01T00:00:00.000Z',
              },
              error: null,
            }),
          };
        }
        return {};
      });

      await expect(
        service.getCurrentCode(customerUser, 'token', subscriptionId)
      ).rejects.toThrow(AppException);

      try {
        await service.getCurrentCode(customerUser, 'token', subscriptionId);
      } catch (err: any) {
        expect(err.code).toBe('ERR_3004_COFFEE_PASS_EXPIRED');
      }
    });

    it('should generate a valid 6-digit TOTP code and expiration time without exposing secret', async () => {
      const secret = generateSecret();
      const futureDate = new Date(Date.now() + 10000000).toISOString();

      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: customerId }, error: null }),
          };
        }
        if (table === 'coffee_pass_subscriptions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                totp_secret: secret,
                remaining_redemptions: 5,
                expires_at: futureDate,
              },
              error: null,
            }),
          };
        }
        return {};
      });

      const result = await service.getCurrentCode(customerUser, 'token', subscriptionId);

      expect(result.code).toMatch(/^\d{6}$/);
      expect(result.expires_in).toBeGreaterThan(0);
      expect(result.expires_in).toBeLessThanOrEqual(30);
      expect((result as any).totp_secret).toBeUndefined();
    });
  });

  describe('redeem', () => {
    it('should reject redeem when TOTP code is invalid', async () => {
      const secret = generateSecret();
      const futureDate = new Date(Date.now() + 10000000).toISOString();

      mockSupabaseUser.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: subscriptionId,
            totp_secret: secret,
            remaining_redemptions: 3,
            expires_at: futureDate,
            customer_id: customerId,
          },
          error: null,
        }),
      });

      await expect(
        service.redeem(staffUser, 'token', subscriptionId, { code: '000000' })
      ).rejects.toThrow(AppException);

      try {
        await service.redeem(staffUser, 'token', subscriptionId, { code: '000000' });
      } catch (err: any) {
        expect(err.code).toBe('ERR_3005_INVALID_TOTP_CODE');
      }
    });

    it('should reject replay attack when same TOTP code is reused within 30s window', async () => {
      const secret = generateSecret();
      const validCode = await generate({ secret });
      const futureDate = new Date(Date.now() + 10000000).toISOString();

      mockSupabaseUser.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: subscriptionId,
            totp_secret: secret,
            remaining_redemptions: 3,
            expires_at: futureDate,
            customer_id: customerId,
          },
          error: null,
        }),
      });

      // Redis SET NX EX fails because key was already claimed (replay attack)
      mockRedisClient.set.mockResolvedValue(null);

      await expect(
        service.redeem(staffUser, 'token', subscriptionId, { code: validCode })
      ).rejects.toThrow(AppException);

      try {
        await service.redeem(staffUser, 'token', subscriptionId, { code: validCode });
      } catch (err: any) {
        expect(err.code).toBe('ERR_3005_INVALID_TOTP_CODE');
        expect(err.message).toContain('đã được sử dụng');
      }
    });

    it('should successfully redeem valid code, decrement redemptions, and log audit', async () => {
      const secret = generateSecret();
      const validCode = await generate({ secret });
      const futureDate = new Date(Date.now() + 10000000).toISOString();

      const subData = {
        id: subscriptionId,
        totp_secret: secret,
        remaining_redemptions: 5,
        expires_at: futureDate,
        customer_id: customerId,
      };

      const updateChain: any = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{ id: subscriptionId }], error: null }),
      };

      const tableMock: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: subData, error: null }),
        update: vi.fn().mockReturnValue(updateChain),
      };

      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'coffee_pass_subscriptions') return tableMock;
        return {};
      });

      const auditInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'audit_logs') return { insert: auditInsert };
        return {};
      });

      mockRedisClient.set.mockResolvedValue('OK');

      const result = await service.redeem(staffUser, 'token', subscriptionId, { code: validCode });

      expect(result.message).toContain('thành công');
      expect(result.remaining_redemptions).toBe(4);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.stringContaining(`coffee_pass:redeemed:${tenantId}:${subscriptionId}:`),
        '1',
        'EX',
        60,
        'NX'
      );
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: tenantId,
          action: 'REDEEM_COFFEE_PASS',
          entity_type: 'coffee_pass_subscriptions',
          entity_id: subscriptionId,
        })
      );
    });
  });
});
