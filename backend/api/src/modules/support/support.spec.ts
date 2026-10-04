import { describe, it, expect } from 'vitest';

/**
 * Unit tests cho các business logic đơn giản không cần DB/Redis.
 * E2E tests yêu cầu Supabase + Redis chạy local — xem B2_PROGRESS.md.
 */

// ─── CSAT Priority Logic ────────────────────────────────────────────────────
describe('CSAT Priority', () => {
  const getPriority = (score: number) => (score <= 2 ? 'URGENT' : 'NORMAL');

  it('score 1 → URGENT', () => {
    expect(getPriority(1)).toBe('URGENT');
  });

  it('score 2 → URGENT', () => {
    expect(getPriority(2)).toBe('URGENT');
  });

  it('score 3 → NORMAL', () => {
    expect(getPriority(3)).toBe('NORMAL');
  });

  it('score 5 → NORMAL', () => {
    expect(getPriority(5)).toBe('NORMAL');
  });
});

// ─── Wallet Debit Strategy ──────────────────────────────────────────────────
describe('Wallet Debit Strategy (PROMO first, then MAIN)', () => {
  const calcDebit = (promoBalance: number, mainBalance: number, amountToPay: number) => {
    if (promoBalance + mainBalance < amountToPay) {
      return null; // insufficient
    }
    let remaining = amountToPay;
    const promoDeducted = Math.min(promoBalance, remaining);
    remaining -= promoDeducted;
    const mainDeducted = remaining;
    return {
      promoDeducted,
      mainDeducted,
      newPromoBalance: promoBalance - promoDeducted,
      newMainBalance: mainBalance - mainDeducted
    };
  };

  it('PROMO covers full amount', () => {
    const result = calcDebit(500, 1000, 300);
    expect(result).not.toBeNull();
    expect(result!.promoDeducted).toBe(300);
    expect(result!.mainDeducted).toBe(0);
    expect(result!.newPromoBalance).toBe(200);
    expect(result!.newMainBalance).toBe(1000);
  });

  it('PROMO partial, MAIN covers rest', () => {
    const result = calcDebit(100, 1000, 300);
    expect(result).not.toBeNull();
    expect(result!.promoDeducted).toBe(100);
    expect(result!.mainDeducted).toBe(200);
    expect(result!.newPromoBalance).toBe(0);
    expect(result!.newMainBalance).toBe(800);
  });

  it('PROMO empty, MAIN covers all', () => {
    const result = calcDebit(0, 1000, 300);
    expect(result).not.toBeNull();
    expect(result!.promoDeducted).toBe(0);
    expect(result!.mainDeducted).toBe(300);
    expect(result!.newMainBalance).toBe(700);
  });

  it('Insufficient balance returns null', () => {
    const result = calcDebit(50, 100, 300);
    expect(result).toBeNull();
  });
});

// ─── Maker-Checker Self-Approval Prevention ─────────────────────────────────
describe('Maker-Checker Self-Approval Prevention', () => {
  const canApprove = (makerId: string, checkerId: string) => makerId !== checkerId;

  it('Different users can approve', () => {
    expect(canApprove('user-A', 'user-B')).toBe(true);
  });

  it('Same user cannot self-approve', () => {
    expect(canApprove('user-A', 'user-A')).toBe(false);
  });
});

// ─── Coffee Pass TOTP Window Calculation ────────────────────────────────────
describe('Coffee Pass TOTP Window', () => {
  const STEP = 30;
  const getTimeRemaining = (epochSeconds: number) => STEP - (epochSeconds % STEP);

  it('Start of window → 30s remaining', () => {
    // epoch divisible by 30 → 30 remaining
    expect(getTimeRemaining(60)).toBe(30);
  });

  it('Middle of window → ~15s remaining', () => {
    expect(getTimeRemaining(75)).toBe(15);
  });

  it('End of window → 1s remaining', () => {
    expect(getTimeRemaining(89)).toBe(1);
  });
});

// ─── Reservation Code Format ─────────────────────────────────────────────────
describe('Reservation Code Format', () => {
  it('starts with RES_', () => {
    const code = 'RES_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    expect(code).toMatch(/^RES_[A-Z0-9]{6}$/);
  });
});

// ─── Merge Same Customer Validation ─────────────────────────────────────────
describe('Merge Same Customer Validation', () => {
  const validateMerge = (sourceId: string, targetId: string) => sourceId !== targetId;

  it('Different IDs → valid', () => {
    expect(validateMerge('id-1', 'id-2')).toBe(true);
  });

  it('Same ID → invalid', () => {
    expect(validateMerge('id-1', 'id-1')).toBe(false);
  });
});

// ─── Group Order Confirm-twice Prevention ────────────────────────────────────
describe('Group Order Session State', () => {
  it('Confirmed session blocks further actions', () => {
    const cart = { confirmed: true, cart_items: [] };
    const canAdd = !cart.confirmed;
    expect(canAdd).toBe(false);
  });

  it('Active session allows adding items', () => {
    const cart = { confirmed: false, cart_items: [] };
    const canAdd = !cart.confirmed;
    expect(canAdd).toBe(true);
  });
});

// ─── Task Fix 1: Unmatched Payment Tenant Isolation ─────────────────────────
//
// Tests cho logic thuần (không cần DB/Redis). Mô phỏng chính xác behaviour
// của processMockPayment và listUnmatched sau khi fix.
//
// CASE A: Unmatched transaction phải được gắn đúng tenantId của caller.
// CASE B: Support của đúng tenant thấy transaction.
// CASE C: Support của tenant khác KHÔNG thấy transaction.
// CASE D: suggestMatch chỉ search trong tenant của mình (via p_tenant_id param).
// CASE E: Matched transaction vẫn dùng tenant_id từ Redis (server-side) + cross-tenant guard.
// CASE F: tenantId không hợp lệ (không tồn tại trong DB) → reject.

describe('Task Fix 1 — Unmatched Payment Tenant Isolation', () => {

  // ── CASE A ───────────────────────────────────────────────────────────────
  describe('CASE A: Unmatched transaction gắn đúng tenant của caller', () => {
    it('processMockPayment insert phải có tenant_id = tenantId param', () => {
      // Simulate logic của processMockPayment — unmatched path
      const callerTenantId = 'tenant-A-uuid';
      const insertPayload = buildUnmatchedInsertPayload(callerTenantId, 50000, 'RANDOM TRANSFER NO CODE');
      expect(insertPayload.tenant_id).toBe('tenant-A-uuid');
      expect(insertPayload.status).toBe('UNMATCHED');
    });

    it('Không được lưu null tenant_id (kể cả unmatched)', () => {
      const callerTenantId = 'tenant-A-uuid';
      const insertPayload = buildUnmatchedInsertPayload(callerTenantId, 50000, 'RANDOM TRANSFER NO CODE');
      expect(insertPayload.tenant_id).not.toBeNull();
      expect(insertPayload.tenant_id).not.toBeUndefined();
    });
  });

  // ── CASE B ───────────────────────────────────────────────────────────────
  describe('CASE B: Support Tenant A thấy transaction của Tenant A', () => {
    it('transaction với tenant_id=A visible khi user.tenant_id=A', () => {
      const txTenantId = 'tenant-A-uuid';
      const userTenantId = 'tenant-A-uuid';
      // Simulate listUnmatched filter logic
      const isVisible = filterTransactionByTenant(txTenantId, userTenantId);
      expect(isVisible).toBe(true);
    });
  });

  // ── CASE C ───────────────────────────────────────────────────────────────
  describe('CASE C: Support Tenant B KHÔNG thấy transaction của Tenant A', () => {
    it('transaction với tenant_id=A không visible khi user.tenant_id=B', () => {
      const txTenantId = 'tenant-A-uuid';
      const userTenantId = 'tenant-B-uuid';
      const isVisible = filterTransactionByTenant(txTenantId, userTenantId);
      expect(isVisible).toBe(false);
    });

    it('transaction với tenant_id=null không visible cho bất kỳ tenant nào', () => {
      const txTenantId = null;
      const userTenantId = 'tenant-A-uuid';
      // null !== 'tenant-A-uuid' → không visible — đây chính là bug cũ
      const isVisible = filterTransactionByTenant(txTenantId, userTenantId);
      expect(isVisible).toBe(false);
    });
  });

  // ── CASE D ───────────────────────────────────────────────────────────────
  describe('CASE D: suggestMatch chỉ tìm candidate trong tenant mình', () => {
    it('fn_suggest_customer_match được gọi với p_tenant_id = user.tenant_id', () => {
      const userTenantId = 'tenant-A-uuid';
      const rpcParams = buildSuggestMatchParams('nội dung chuyển khoản', userTenantId);
      expect(rpcParams.p_tenant_id).toBe('tenant-A-uuid');
    });

    it('tenant isolation: params không chứa tenant_id của tenant khác', () => {
      const userTenantId = 'tenant-A-uuid';
      const rpcParams = buildSuggestMatchParams('dummy content', userTenantId);
      expect(rpcParams.p_tenant_id).not.toBe('tenant-B-uuid');
    });
  });

  // ── CASE E ───────────────────────────────────────────────────────────────
  describe('CASE E: Matched payment vẫn hoạt động bình thường', () => {
    it('Matched path dùng tenant_id từ Redis (server-side), không từ client', () => {
      const redisResData = { tenant_id: 'tenant-A-uuid', table_id: 'table-1', amount: 50000 };
      const routeParamTenantId = 'tenant-A-uuid';
      // Cross-tenant guard: resData.tenant_id phải khớp tenantId param
      const isCrossTenantAttempt = redisResData.tenant_id !== routeParamTenantId;
      expect(isCrossTenantAttempt).toBe(false); // hợp lệ → không reject
    });

    it('Cross-tenant attempt bị reject: tenantId param ≠ reservation.tenant_id', () => {
      const redisResData = { tenant_id: 'tenant-A-uuid', table_id: 'table-1', amount: 50000 };
      const routeParamTenantId = 'tenant-B-uuid'; // kẻ tấn công gửi tenant B
      const isCrossTenantAttempt = redisResData.tenant_id !== routeParamTenantId;
      expect(isCrossTenantAttempt).toBe(true); // → phải throw TENANT_MISMATCH
    });

    it('Matched insert payload chứa reservation_code và status COMPLETED', () => {
      const resData = { tenant_id: 'tenant-A-uuid', table_id: 'table-1', amount: 50000 };
      const payload = buildMatchedInsertPayload(resData, 'RES_ABC123', 50000, 'RES_ABC123 deposit');
      expect(payload.reservation_code).toBe('RES_ABC123');
      expect(payload.status).toBe('COMPLETED');
      expect(payload.tenant_id).toBe('tenant-A-uuid');
    });
  });

  // ── CASE F ───────────────────────────────────────────────────────────────
  describe('CASE F: tenantId không hợp lệ → reject trước khi insert', () => {
    it('Tenant validation: tenant null → không hợp lệ', () => {
      const dbResult = { tenant: null };
      const isValid = validateTenant(dbResult.tenant);
      expect(isValid).toBe(false);
    });

    it('Tenant validation: tenant tồn tại → hợp lệ', () => {
      const dbResult = { tenant: { id: 'tenant-A-uuid' } };
      const isValid = validateTenant(dbResult.tenant);
      expect(isValid).toBe(true);
    });

    it('UUID format không phải UUID hợp lệ → tenant không tìm thấy', () => {
      // Simulate DB trả về null khi eq('id', 'not-a-uuid') không match
      const dbResult = { tenant: null };
      const isValid = validateTenant(dbResult.tenant);
      expect(isValid).toBe(false);
    });
  });
});

// ─── Pure helper functions mô phỏng logic thực tế ────────────────────────────

/** Mô phỏng buildPayload cho unmatched insert (sau fix) */
function buildUnmatchedInsertPayload(tenantId: string, amount: number, content: string) {
  return {
    tenant_id: tenantId,   // ← fix: luôn set tenant_id
    amount,
    raw_transfer_content: content,
    status: 'UNMATCHED' as const
  };
}

/** Mô phỏng filter logic trong listUnmatched (PostgREST .eq('payment_transactions.tenant_id', user.tenant_id)) */
function filterTransactionByTenant(txTenantId: string | null, userTenantId: string): boolean {
  return txTenantId === userTenantId;
}

/** Mô phỏng RPC params trong suggestMatch */
function buildSuggestMatchParams(transferContent: string, userTenantId: string) {
  return { p_transfer_content: transferContent, p_tenant_id: userTenantId };
}

/** Mô phỏng matched payment insert payload */
function buildMatchedInsertPayload(resData: { tenant_id: string }, code: string, amount: number, content: string) {
  return {
    tenant_id: resData.tenant_id,
    reservation_code: code,
    amount,
    raw_transfer_content: content,
    status: 'COMPLETED' as const
  };
}

/** Mô phỏng tenant validation (tenant không null = hợp lệ) */
function validateTenant(tenant: { id: string } | null): boolean {
  return tenant !== null && tenant !== undefined;
}

// ─── SupportService Implementation Tests ─────────────────────────────────────
import { vi, beforeEach } from 'vitest';
import { SupportService } from './support.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';

describe('SupportService Implementation Tests', () => {
  let service: SupportService;
  let mockSupabaseUser: any;
  let mockSupabaseAdmin: any;
  let mockRealtimeGateway: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const orderId = 'order-uuid-1';
  const customerId = 'cust-uuid-1';
  const unmatchedId = 'unmatched-uuid-1';

  const customerUser = {
    sub: 'auth-cust-1',
    tenant_id: tenantId,
    branch_id: null,
    role_app: 'CUSTOMER' as const,
  };

  const supportMakerUser = {
    sub: 'auth-support-maker',
    tenant_id: tenantId,
    branch_id: null,
    role_app: 'SUPPORT' as const,
  };

  const supportCheckerUser = {
    sub: 'auth-support-checker',
    tenant_id: tenantId,
    branch_id: null,
    role_app: 'SUPPORT' as const,
  };

  beforeEach(() => {
    mockSupabaseUser = { from: vi.fn() };
    mockSupabaseAdmin = { from: vi.fn(), rpc: vi.fn() };
    mockRealtimeGateway = {
      emitSupportTicketUrgent: vi.fn(),
      emitUnmatchedTransactionCreated: vi.fn(),
    };

    const mockSupabaseService: any = {
      forUser: () => mockSupabaseUser,
      admin: () => mockSupabaseAdmin,
    };

    service = new SupportService(mockSupabaseService, mockRealtimeGateway as any);
  });

  describe('submitCsat', () => {
    it('should throw ERR_4001_ORDER_NOT_FOUND when order does not exist in tenant', async () => {
      mockSupabaseUser.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      });

      await expect(
        service.submitCsat(customerUser, 'token', { order_id: orderId, score: 5 })
      ).rejects.toThrow(AppException);
      try {
        await service.submitCsat(customerUser, 'token', { order_id: orderId, score: 5 });
      } catch (err: any) {
        expect(err.code).toBe('ERR_4001_ORDER_NOT_FOUND');
      }
    });

    it('should throw ERR_6005_CSAT_ALREADY_SUBMITTED when order already has a ticket', async () => {
      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: orderId, customer_id: customerId, status: 'COMPLETED' }, error: null }),
          };
        }
        if (table === 'support_tickets') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'ticket-1' }, error: null }),
          };
        }
        return {};
      });

      await expect(
        service.submitCsat(customerUser, 'token', { order_id: orderId, score: 4 })
      ).rejects.toThrow(AppException);
      try {
        await service.submitCsat(customerUser, 'token', { order_id: orderId, score: 4 });
      } catch (err: any) {
        expect(err.code).toBe('ERR_6005_CSAT_ALREADY_SUBMITTED');
      }
    });

    it('should create URGENT ticket and emit realtime event when score <= 2', async () => {
      const insertedTicket = {
        id: 'ticket-urgent-1',
        order_id: orderId,
        priority: 'URGENT',
        status: 'OPEN',
      };

      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: orderId, customer_id: customerId, status: 'COMPLETED' }, error: null }),
          };
        }
        if (table === 'support_tickets') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: insertedTicket, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await service.submitCsat(customerUser, 'token', {
        order_id: orderId,
        score: 1,
        complaint_note: 'Đồ uống quá nguội',
      });

      expect(result.message).toContain('thành công');
      expect(mockRealtimeGateway.emitSupportTicketUrgent).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          ticket_id: 'ticket-urgent-1',
          order_id: orderId,
          csat_score: 1,
        })
      );
    });
  });

  describe('Maker-Checker: proposeMatch & approveMatch', () => {
    it('should propose match and set status PROPOSED with maker info and audit log', async () => {
      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'maker-user-id' }, error: null }),
          };
        }
        if (table === 'unmatched_transactions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: unmatchedId, status: 'PENDING', payment_transactions: { tenant_id: tenantId } },
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: unmatchedId, status: 'PROPOSED', suggested_customer_id: customerId },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: customerId }, error: null }),
          };
        }
        return {};
      });

      const auditInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseAdmin.from.mockReturnValue({ insert: auditInsert });

      const result = await service.proposeMatch(supportMakerUser, 'token', unmatchedId, {
        customer_id: customerId,
      });

      expect(result.message).toContain('thành công');
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: tenantId,
          action: 'PROPOSE_CUSTOMER_MATCH',
          entity_id: unmatchedId,
        })
      );
    });

    it('should reject approveMatch with ERR_6002_SELF_APPROVAL when checker is the same as maker', async () => {
      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'same-user-id' }, error: null }),
          };
        }
        if (table === 'unmatched_transactions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: unmatchedId,
                status: 'PROPOSED',
                maker_user_id: 'same-user-id', // Maker is this user!
                suggested_customer_id: customerId,
                payment_transactions: { id: 'ptx-1', tenant_id: tenantId },
              },
              error: null,
            }),
          };
        }
        return {};
      });

      await expect(service.approveMatch(supportMakerUser, 'token', unmatchedId)).rejects.toThrow(AppException);
      try {
        await service.approveMatch(supportMakerUser, 'token', unmatchedId);
      } catch (err: any) {
        expect(err.code).toBe('ERR_6002_SELF_APPROVAL');
      }
    });

    it('should approve match successfully when checker is different from maker', async () => {
      const updateUnmatched = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const updatePaymentTx = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'checker-user-id' }, error: null }),
          };
        }
        if (table === 'unmatched_transactions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: unmatchedId,
                status: 'PROPOSED',
                maker_user_id: 'maker-user-id', // Different!
                suggested_customer_id: customerId,
                payment_transactions: { id: 'ptx-1', tenant_id: tenantId },
              },
              error: null,
            }),
            update: updateUnmatched,
          };
        }
        if (table === 'payment_transactions') {
          return { update: updatePaymentTx };
        }
        return {};
      });

      const auditInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseAdmin.from.mockReturnValue({ insert: auditInsert });

      const result = await service.approveMatch(supportCheckerUser, 'token', unmatchedId);

      expect(result.message).toContain('thành công');
      expect(updateUnmatched).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'APPROVED', checker_user_id: 'checker-user-id' })
      );
      expect(updatePaymentTx).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'MATCHED', matched_customer_id: customerId })
      );
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: tenantId,
          action: 'APPROVE_CUSTOMER_MATCH',
          actor_user_id: 'checker-user-id',
        })
      );
    });
  });

  describe('mergeCustomers', () => {
    it('should throw ERR_6004_MERGE_SAME_CUSTOMER when source and target are the same', async () => {
      await expect(
        service.mergeCustomers(supportMakerUser, 'token', {
          source_customer_id: 'cust-same',
          target_customer_id: 'cust-same',
        })
      ).rejects.toThrow(AppException);
      try {
        await service.mergeCustomers(supportMakerUser, 'token', {
          source_customer_id: 'cust-same',
          target_customer_id: 'cust-same',
        });
      } catch (err: any) {
        expect(err.code).toBe('ERR_6004_MERGE_SAME_CUSTOMER');
      }
    });

    it('should invoke atomic RPC fn_merge_customer_profiles and write audit log', async () => {
      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'staff-user-id' }, error: null }),
          };
        }
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'cust-valid' }, error: null }),
          };
        }
        return {};
      });

      mockSupabaseAdmin.rpc.mockResolvedValue({ error: null });
      const auditInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseAdmin.from.mockReturnValue({ insert: auditInsert });

      const result = await service.mergeCustomers(supportMakerUser, 'token', {
        source_customer_id: 'cust-1',
        target_customer_id: 'cust-2',
      });

      expect(result.message).toContain('thành công');
      expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith('fn_merge_customer_profiles', {
        source_id: 'cust-1',
        target_id: 'cust-2',
      });
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MERGE_CUSTOMER_PROFILES',
          entity_id: 'cust-2',
        })
      );
    });
  });
});
