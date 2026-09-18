import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletService } from './wallet.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';

describe('WalletService - Topup & Production Guard Tests', () => {
  let service: WalletService;
  let mockSupabaseUser: any;
  let mockSupabaseAdmin: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const customerId = 'cust-123';
  const walletId = 'wallet-456';
  const user = {
    sub: 'auth-user-789',
    tenant_id: tenantId,
    branch_id: 'branch-1',
    role_app: 'CUSTOMER' as const,
  };

  beforeEach(() => {
    mockSupabaseUser = {
      from: vi.fn(),
    };
    mockSupabaseAdmin = {
      from: vi.fn(),
    };

    const mockSupabaseService: any = {
      forUser: () => mockSupabaseUser,
      admin: () => mockSupabaseAdmin,
    };

    service = new WalletService(mockSupabaseService);
  });

  it('(Scenario 9) should block wallet topup in production mode when ALLOW_MOCK_WALLET_TOPUP is not enabled', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalFlag = process.env.ALLOW_MOCK_WALLET_TOPUP;

    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_MOCK_WALLET_TOPUP;

    await expect(
      service.topup(user, 'token', { amount: 100000 })
    ).rejects.toThrow(AppException);

    try {
      await service.topup(user, 'token', { amount: 100000 });
    } catch (err: any) {
      expect(err.code).toBe('ERR_1002_FORBIDDEN_ROLE');
    }

    // Restore
    process.env.NODE_ENV = originalEnv;
    if (originalFlag) process.env.ALLOW_MOCK_WALLET_TOPUP = originalFlag;
  });

  it('should allow wallet topup in non-production environment or when flag is set', async () => {
    process.env.NODE_ENV = 'development';

    const customerQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: customerId },
        error: null,
      }),
    };

    const walletQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: walletId, main_balance: 50000 },
        error: null,
      }),
    };

    const updateWalletQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [{ id: walletId }],
        error: null,
      }),
    };

    const insertTxQuery = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabaseUser.from.mockImplementation((table: string) => {
      if (table === 'customers') return customerQuery;
      if (table === 'wallets') return walletQuery;
      return {};
    });

    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'wallets') return updateWalletQuery;
      if (table === 'wallet_transactions') return insertTxQuery;
      if (table === 'audit_logs') return insertTxQuery;
      return {};
    });

    const result = await service.topup(user, 'token', { amount: 50000 });

    expect(result.message).toBe('Nạp tiền thành công');
    expect(result.main_balance).toBe(100000);
  });

  it('should reject topup when optimistic locking detects concurrent balance modification', async () => {
    process.env.NODE_ENV = 'development';

    const customerQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: customerId }, error: null }),
    };

    const walletQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: walletId, main_balance: 50000 }, error: null }),
    };

    const updateWalletQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }), // no rows updated due to balance change
    };

    mockSupabaseUser.from.mockImplementation((table: string) => {
      if (table === 'customers') return customerQuery;
      if (table === 'wallets') return walletQuery;
      return {};
    });

    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'wallets') return updateWalletQuery;
      return {};
    });

    await expect(service.topup(user, 'token', { amount: 50000 })).rejects.toThrow(AppException);
  });

  describe('WalletService.getWallet', () => {
    it('should throw ERR_1001_UNAUTHORIZED when customer profile is not found', async () => {
      mockSupabaseUser.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      });

      await expect(service.getWallet(user, 'token')).rejects.toThrow(AppException);
    });

    it('should return wallet when customer and wallet exist', async () => {
      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: customerId }, error: null }),
          };
        }
        if (table === 'wallets') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: walletId, main_balance: 150000, promo_balance: 20000, updated_at: '2026-09-14' },
              error: null,
            }),
          };
        }
        return {};
      });

      const result = await service.getWallet(user, 'token');
      expect(result.main_balance).toBe(150000);
      expect(result.promo_balance).toBe(20000);
    });
  });

  describe('WalletService.getTransactions', () => {
    it('should paginate transactions correctly with range offset and limit', async () => {
      const mockTx = [
        { id: 'tx-1', amount: 50000, type: 'TOPUP' },
        { id: 'tx-2', amount: -30000, type: 'PAYMENT' },
      ];

      const txQuery: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockTx, count: 25, error: null }),
      };

      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: customerId }, error: null }),
          };
        }
        if (table === 'wallets') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: walletId }, error: null }),
          };
        }
        if (table === 'wallet_transactions') return txQuery;
        return {};
      });

      const result = await service.getTransactions(user, 'token', 2, 10);

      // Page 2, Limit 10 -> start: 10, end: 19
      expect(txQuery.range).toHaveBeenCalledWith(10, 19);
      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({ total: 25, page: 2, limit: 10 });
    });
  });

  describe('WalletService.getVouchers', () => {
    it('should filter out expired vouchers and keep active ones', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 100000).toISOString();
      const future = new Date(now.getTime() + 100000).toISOString();

      const vouchers = [
        { id: 'v-1', is_used: false, expires_at: past },
        { id: 'v-2', is_used: false, expires_at: future },
        { id: 'v-3', is_used: false, expires_at: null },
      ];

      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: customerId }, error: null }),
          };
        }
        if (table === 'customer_vouchers') {
          const secondEq = vi.fn().mockResolvedValue({ data: vouchers, error: null });
          const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
          return {
            select: vi.fn().mockReturnValue({ eq: firstEq }),
          };
        }
        return {};
      });

      const result = await service.getVouchers(user, 'token');
      expect(result.vouchers).toHaveLength(2);
      expect(result.vouchers.map(v => v.id)).toEqual(['v-2', 'v-3']);
    });
  });

  describe('WalletService.payWithWallet', () => {
    it('should throw ERR_3003_INSUFFICIENT_WALLET_BALANCE when combined balance is insufficient', async () => {
      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: customerId }, error: null }),
          };
        }
        if (table === 'wallets') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: walletId, main_balance: 20000, promo_balance: 10000 },
              error: null,
            }),
          };
        }
        return {};
      });

      await expect(service.payWithWallet(user, 'token', 50000, 'order-1')).rejects.toThrow(AppException);
      try {
        await service.payWithWallet(user, 'token', 50000, 'order-1');
      } catch (err: any) {
        expect(err.code).toBe('ERR_3003_INSUFFICIENT_WALLET_BALANCE');
      }
    });

    it('should deduct PROMO balance first then MAIN balance when paying with wallet', async () => {
      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: customerId }, error: null }),
          };
        }
        if (table === 'wallets') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: walletId, main_balance: 100000, promo_balance: 20000 },
              error: null,
            }),
          };
        }
        return {};
      });

      const updateWallet = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [{ id: walletId }], error: null }),
      };

      const insertTx = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'wallets') return updateWallet;
        if (table === 'wallet_transactions') return insertTx;
        return {};
      });

      // Pay 50,000: Promo has 20,000 -> deduct all 20,000 promo. Main covers remaining 30,000 -> 70,000 remains.
      const result = await service.payWithWallet(user, 'token', 50000, 'order-1');

      expect(result).toBe(true);
      expect(updateWallet.update).toHaveBeenCalledWith({
        promo_balance: 0,
        main_balance: 70000,
      });
      // Should record 2 wallet transactions (1 PROMO, 1 MAIN)
      expect(insertTx.insert).toHaveBeenCalledTimes(2);
    });
  });
});
