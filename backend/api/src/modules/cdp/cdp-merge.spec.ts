import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupportService } from '../support/support.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';

/**
 * (Scenario 2) Customer Profile Merge Tests
 *
 * NOTE: SQL execution of fn_merge_customer_profiles and Postgres RLS
 * are [NOT LIVE VERIFIED] without a running Supabase/PostgreSQL instance.
 * These tests verify the application-level validation, tenant isolation,
 * and RPC invocation inside SupportService.
 */
describe('SupportService - mergeCustomers & Tenant Boundary', () => {
  let service: SupportService;
  let mockSupabaseUser: any;
  let mockSupabaseAdmin: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const supportUser: AuthenticatedUser = {
    sub: 'support-auth-user',
    tenant_id: tenantId,
    branch_id: null,
    role_app: 'SUPPORT',
    email: 'support@fnb.com',
  };

  beforeEach(() => {
    mockSupabaseUser = {
      from: vi.fn(),
    };
    mockSupabaseAdmin = {
      rpc: vi.fn(),
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    const mockSupabaseService: any = {
      forUser: () => mockSupabaseUser,
      admin: () => mockSupabaseAdmin,
    };
    const mockRealtimeGateway: any = {
      emitSupportTicketUrgentCreated: vi.fn(),
    };

    service = new SupportService(mockSupabaseService, mockRealtimeGateway);
  });

  it('should reject merging when source_customer_id equals target_customer_id', async () => {
    await expect(
      service.mergeCustomers(supportUser, 'token', {
        source_customer_id: 'cust-1',
        target_customer_id: 'cust-1',
      })
    ).rejects.toThrow(AppException);

    try {
      await service.mergeCustomers(supportUser, 'token', {
        source_customer_id: 'cust-1',
        target_customer_id: 'cust-1',
      });
    } catch (err: any) {
      expect(err.code).toBe('ERR_6004_MERGE_SAME_CUSTOMER');
    }
  });

  it('should reject merging if source customer is not in the same tenant (NEW-002 cross-tenant check)', async () => {
    // 1. Staff user lookup
    const userQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'staff-1' }, error: null }),
    };

    // 2. Source customer lookup (returns null because tenant mismatch)
    const sourceCustomerQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((_col: string, _val: string) => {
        return sourceCustomerQuery;
      }),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    };

    mockSupabaseUser.from.mockImplementation((table: string) => {
      if (table === 'users') return userQuery;
      if (table === 'customers') return sourceCustomerQuery;
      return {};
    });

    await expect(
      service.mergeCustomers(supportUser, 'token', {
        source_customer_id: 'cust-cross-tenant-source',
        target_customer_id: 'cust-target-local',
      })
    ).rejects.toThrow(AppException);

    try {
      await service.mergeCustomers(supportUser, 'token', {
        source_customer_id: 'cust-cross-tenant-source',
        target_customer_id: 'cust-target-local',
      });
    } catch (err: any) {
      expect(err.code).toBe('ERR_9001_VALIDATION_FAILED');
      expect(err.message).toContain('Source customer không tồn tại trong tenant');
    }
  });

  it('should reject merging if target customer is not in the same tenant', async () => {
    mockSupabaseUser.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'staff-1' }, error: null }),
        };
      }
      if (table === 'customers') {
        let queriedId = '';
        const query: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col: string, val: string) => {
            if (col === 'id') queriedId = val;
            return query;
          }),
          single: vi.fn().mockImplementation(() => {
            if (queriedId === 'cust-source') {
              return Promise.resolve({ data: { id: 'cust-source' }, error: null });
            }
            // cust-cross-tenant-target not found in tenant
            return Promise.resolve({ data: null, error: { message: 'Not found' } });
          }),
        };
        return query;
      }
      return {};
    });

    await expect(
      service.mergeCustomers(supportUser, 'token', {
        source_customer_id: 'cust-source',
        target_customer_id: 'cust-cross-tenant-target',
      })
    ).rejects.toThrow(AppException);

    try {
      await service.mergeCustomers(supportUser, 'token', {
        source_customer_id: 'cust-source',
        target_customer_id: 'cust-cross-tenant-target',
      });
    } catch (err: any) {
      expect(err.code).toBe('ERR_9001_VALIDATION_FAILED');
      expect(err.message).toContain('Target customer không tồn tại trong tenant');
    }
  });

  it('should successfully execute merge RPC and record audit log on valid same-tenant customers', async () => {
    mockSupabaseUser.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'staff-1' }, error: null }),
        };
      }
      if (table === 'customers') {
        let queriedId = '';
        const query: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col: string, val: string) => {
            if (col === 'id') queriedId = val;
            return query;
          }),
          single: vi.fn().mockImplementation(() => {
            return Promise.resolve({ data: { id: queriedId || 'cust-id' }, error: null });
          }),
        };
        return query;
      }
      return {};
    });

    mockSupabaseAdmin.rpc.mockResolvedValue({ error: null });

    const result = await service.mergeCustomers(supportUser, 'token', {
      source_customer_id: 'cust-1',
      target_customer_id: 'cust-2',
    });

    expect(result.message).toBe('Hợp nhất khách hàng thành công');
    expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith('fn_merge_customer_profiles', {
      source_id: 'cust-1',
      target_id: 'cust-2',
    });
    expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('audit_logs');
  });
});
