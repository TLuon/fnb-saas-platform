import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationService } from './reservation.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';

describe('ReservationService - Webhook & Idempotency Tests', () => {
  let service: ReservationService;
  let mockSupabaseAdmin: any;
  let mockRedisClient: any;
  let mockRealtimeGateway: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const tableId = '22222222-2222-2222-2222-222222222222';
  const reservationCode = 'RES_ABC123';
  const rawTransfer = 'RES_ABC123 THANH TOAN COC';

  beforeEach(() => {
    process.env.MOCK_WEBHOOK_SECRET = 'test-secret-123';

    mockRedisClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    mockRealtimeGateway = {
      emitUnmatchedTransactionCreated: vi.fn(),
    };

    mockSupabaseAdmin = {
      from: vi.fn(),
    };

    const mockSupabaseService: any = {
      admin: () => mockSupabaseAdmin,
      forUser: () => mockSupabaseAdmin,
    };

    const mockRedisService: any = {
      getClient: () => mockRedisClient,
    };

    service = new ReservationService(
      mockSupabaseService,
      mockRedisService,
      mockRealtimeGateway,
    );
  });

  it('(Scenario 5) should reject webhook if secret is invalid', async () => {
    await expect(
      service.processMockPayment(tenantId, {
        raw_transfer_content: rawTransfer,
        amount: 50000,
      }, 'wrong-secret')
    ).rejects.toThrow(AppException);

    try {
      await service.processMockPayment(tenantId, {
        raw_transfer_content: rawTransfer,
        amount: 50000,
      }, 'wrong-secret');
    } catch (err: any) {
      expect(err.code).toBe('ERR_1001_UNAUTHORIZED');
    }
  });

  it('(Scenario 6) should process valid webhook and match reservation', async () => {
    // 1. Tenant exists
    const tenantQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: tenantId }, error: null }),
    };

    // 2. Idempotency check: no completed tx
    const completedTxQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    // 3. Insert payment tx with proper chained methods
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'tx-999' }, error: null }),
      }),
    });

    // 4. Update table status
    const updateTableQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'tenants') return tenantQuery;
      if (table === 'tables') return updateTableQuery;
      if (table === 'payment_transactions') {
        return {
          select: completedTxQuery.select,
          eq: completedTxQuery.eq,
          maybeSingle: completedTxQuery.maybeSingle,
          insert: insertMock,
        };
      }
      return {};
    });

    mockRedisClient.get.mockResolvedValue(
      JSON.stringify({
        tenant_id: tenantId,
        table_id: tableId,
        amount: 50000,
      })
    );

    const result = await service.processMockPayment(
      tenantId,
      { raw_transfer_content: rawTransfer, amount: 50000 },
      'test-secret-123'
    );

    expect(result.payment_transaction_id).toBe('tx-999');
    expect(mockRedisClient.del).toHaveBeenCalled();
  });

  it('(Scenario 7) should return idempotent response on duplicate completed webhook', async () => {
    const tenantQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: tenantId }, error: null }),
    };

    const completedTxQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'tx-already-done', status: 'COMPLETED', reservation_code: reservationCode },
        error: null,
      }),
    };

    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'tenants') return tenantQuery;
      if (table === 'payment_transactions') return completedTxQuery;
      return {};
    });

    const result = await service.processMockPayment(
      tenantId,
      { raw_transfer_content: rawTransfer, amount: 50000 },
      'test-secret-123'
    );

    expect(result.idempotent).toBe(true);
    expect(result.payment_transaction_id).toBe('tx-already-done');
    expect(mockRedisClient.del).not.toHaveBeenCalled();
  });

  it('(Scenario 8 & 12) should handle unmatched payment and emit realtime event to correct tenant room', async () => {
    const tenantQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: tenantId }, error: null }),
    };

    const paymentTxHandler = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'unmatched-tx-101' }, error: null }),
        }),
      }),
    };

    const unmatchedTableHandler = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'tenants') return tenantQuery;
      if (table === 'payment_transactions') return paymentTxHandler;
      if (table === 'unmatched_transactions') return unmatchedTableHandler;
      return {};
    });

    // Redis returns null (reservation expired or invalid code)
    mockRedisClient.get.mockResolvedValue(null);

    await expect(
      service.processMockPayment(
        tenantId,
        { raw_transfer_content: 'UNKNOWN TRANSFER CONTENT', amount: 100000 },
        'test-secret-123'
      )
    ).rejects.toThrow(AppException);

    try {
      await service.processMockPayment(
        tenantId,
        { raw_transfer_content: 'UNKNOWN TRANSFER CONTENT', amount: 100000 },
        'test-secret-123'
      );
    } catch (err: any) {
      expect(err.code).toBe('ERR_3002_PAYMENT_CONTENT_MISMATCH');
    }

    // Verify realtime event was emitted specifically to support:tenantId
    expect(mockRealtimeGateway.emitUnmatchedTransactionCreated).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({
        transaction_id: 'unmatched-tx-101',
        amount: 100000,
        raw_transfer_content: 'UNKNOWN TRANSFER CONTENT',
      })
    );
  });

  it('(NEW-003) should reject webhook if secret is wrong or missing', async () => {
    await expect(
      service.processMockPayment(
        tenantId,
        { raw_transfer_content: rawTransfer, amount: 50000 },
        'wrong-secret'
      )
    ).rejects.toThrow(AppException);

    try {
      await service.processMockPayment(
        tenantId,
        { raw_transfer_content: rawTransfer, amount: 50000 },
        ''
      );
    } catch (err: any) {
      expect(err.code).toBe('ERR_1001_UNAUTHORIZED');
    }
  });

  it('(NEW-003) should fail closed in production if MOCK_WEBHOOK_SECRET is not configured', async () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.MOCK_WEBHOOK_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.MOCK_WEBHOOK_SECRET;

      await expect(
        service.processMockPayment(
          tenantId,
          { raw_transfer_content: rawTransfer, amount: 50000 },
          'any-secret'
        )
      ).rejects.toThrow(AppException);

      try {
        await service.processMockPayment(
          tenantId,
          { raw_transfer_content: rawTransfer, amount: 50000 },
          'any-secret'
        );
      } catch (err: any) {
        expect(err.code).toBe('ERR_9002_INTERNAL_SERVER_ERROR');
        expect(err.message).toContain('MOCK_WEBHOOK_SECRET');
      }
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.MOCK_WEBHOOK_SECRET = origSecret;
    }
  });

  it('(NEW-007 Concurrency) should recover idempotently when database returns 23505 unique constraint violation', async () => {
    const tenantQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: tenantId }, error: null }),
    };

    let selectCount = 0;
    const paymentTxHandler = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          // Initial select: not found (simulating race condition where concurrent worker hasn't committed yet)
          return Promise.resolve({ data: null, error: null });
        }
        // Fallback select after 23505: returns the newly committed tx
        return Promise.resolve({
          data: { id: 'tx-race-winner', status: 'COMPLETED', reservation_code: reservationCode },
          error: null,
        });
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key value violates unique constraint' },
          }),
        }),
      }),
    };

    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'tenants') return tenantQuery;
      if (table === 'payment_transactions') return paymentTxHandler;
      return {};
    });

    mockRedisClient.get.mockResolvedValue(
      JSON.stringify({ tenant_id: tenantId, table_id: tableId, amount: 50000 })
    );

    const result = await service.processMockPayment(
      tenantId,
      { raw_transfer_content: rawTransfer, amount: 50000 },
      'test-secret-123'
    );

    expect(result.idempotent).toBe(true);
    expect(result.payment_transaction_id).toBe('tx-race-winner');
  });
});

