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
});
