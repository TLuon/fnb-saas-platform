import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CdpService } from './cdp.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';

describe('CdpService - Reports Dashboard & Branch Filtering', () => {
  let service: CdpService;
  let mockSupabaseUser: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const branchQ1 = '22222222-2222-2222-2222-222222222222';
  const branchQ3 = '22222222-2222-2222-2222-333333333333';
  const foreignBranch = '99999999-9999-9999-9999-999999999999';

  const ownerUser: AuthenticatedUser = {
    sub: 'owner-auth-user',
    tenant_id: tenantId,
    branch_id: null,
    role_app: 'OWNER',
    email: 'owner@fnb.com',
  };

  beforeEach(() => {
    mockSupabaseUser = {
      from: vi.fn(),
    };

    const mockSupabaseService: any = {
      forUser: () => mockSupabaseUser,
    };

    service = new CdpService(mockSupabaseService);
  });

  it('1. Tenant isolation: should reject branch UUID belonging to another tenant or non-existent', async () => {
    mockSupabaseUser.from.mockImplementation((table: string) => {
      if (table === 'branches') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    });

    await expect(
      service.getDashboard('mock-token', ownerUser, foreignBranch, 'today'),
    ).rejects.toThrow(AppException);

    try {
      await service.getDashboard('mock-token', ownerUser, foreignBranch, 'today');
    } catch (err: any) {
      expect(err.code).toBe('ERR_9001_VALIDATION_FAILED');
      expect(err.message).toContain('Chi nhánh không hợp lệ');
    }
  });

  it('2. Branch UUID propagation: should filter orders and tables by branch UUID', async () => {
    const ordersFilterEqs: Array<{ field: string; val: any }> = [];

    mockSupabaseUser.from.mockImplementation((table: string) => {
      if (table === 'branches') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: branchQ1, tenant_id: tenantId },
            error: null,
          }),
        };
      }
      if (table === 'orders') {
        const queryBuilder: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn((field, val) => {
            ordersFilterEqs.push({ field, val });
            return queryBuilder;
          }),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: (resolve: any) =>
            resolve({
              data: [
                {
                  id: 'order-1',
                  tenant_id: tenantId,
                  branch_id: branchQ1,
                  status: 'COMPLETED',
                  final_amount: 50000,
                  payment_method: 'VIETQR',
                  created_at: new Date().toISOString(),
                },
                {
                  id: 'order-2',
                  tenant_id: tenantId,
                  branch_id: branchQ1,
                  status: 'COMPLETED',
                  final_amount: 150000,
                  payment_method: 'WALLET',
                  created_at: new Date().toISOString(),
                },
              ],
              error: null,
            }),
        };
        return queryBuilder;
      }
      if (table === 'tables') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [
              { id: 't-1', status: 'OCCUPIED' },
              { id: 't-2', status: 'AVAILABLE' },
            ],
            error: null,
          }),
        };
      }
      if (table === 'order_items') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { product_id: 'p-1', product_name: 'Cà phê', quantity: 2, unit_price: 25000 },
              { product_id: 'p-2', product_name: 'Trà đào', quantity: 3, unit_price: 50000 },
            ],
            error: null,
          }),
        };
      }
      return {};
    });

    const result = await service.getDashboard('mock-token', ownerUser, branchQ1, 'today');

    expect(ordersFilterEqs).toContainEqual({ field: 'branch_id', val: branchQ1 });
    expect(result.revenue).toBe(200000);
    expect(result.orders_count).toBe(2);
    expect(result.average_order_value).toBe(100000);
    expect(result.occupied_tables).toBe(1);
    expect(result.total_tables).toBe(2);
    expect(result.occupancy_rate).toBe(0.5);
    expect(result.top_products).toHaveLength(2);
    expect(result.payment_breakdown).toEqual([
      { method: 'Chuyển khoản / VietQR', amount: 50000, percentage: 25 },
      { method: 'Ví F&B', amount: 150000, percentage: 75 },
    ]);
  });

  it('3. All-branches aggregation: should not filter by branch_id when branchId is omitted', async () => {
    const ordersFilterEqs: Array<{ field: string; val: any }> = [];

    mockSupabaseUser.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        const queryBuilder: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn((field, val) => {
            ordersFilterEqs.push({ field, val });
            return queryBuilder;
          }),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: (resolve: any) =>
            resolve({
              data: [
                {
                  id: 'order-q1',
                  tenant_id: tenantId,
                  branch_id: branchQ1,
                  status: 'COMPLETED',
                  final_amount: 100000,
                  payment_method: 'VIETQR',
                  created_at: new Date().toISOString(),
                },
                {
                  id: 'order-q3',
                  tenant_id: tenantId,
                  branch_id: branchQ3,
                  status: 'COMPLETED',
                  final_amount: 200000,
                  payment_method: 'VIETQR',
                  created_at: new Date().toISOString(),
                },
              ],
              error: null,
            }),
        };
        return queryBuilder;
      }
      if (table === 'tables') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              { id: 't-1', status: 'OCCUPIED' },
              { id: 't-2', status: 'OCCUPIED' },
              { id: 't-3', status: 'AVAILABLE' },
            ],
            error: null,
          }),
        };
      }
      if (table === 'order_items') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {};
    });

    const result = await service.getDashboard('mock-token', ownerUser, undefined, 'today');

    // Should NOT filter by branch_id
    const hasBranchFilter = ordersFilterEqs.some((e) => e.field === 'branch_id');
    expect(hasBranchFilter).toBe(false);

    expect(result.revenue).toBe(300000);
    expect(result.orders_count).toBe(2);
    // Dynamic AOV = 300,000 / 2 = 150,000
    expect(result.average_order_value).toBe(150000);
    expect(result.occupied_tables).toBe(2);
    expect(result.total_tables).toBe(3);
  });

  it('4. Correct average order value: calculates totalRevenue / totalOrders, never averages of averages', async () => {
    mockSupabaseUser.from.mockImplementation((table: string) => {
      if (table === 'orders') {
        const queryBuilder: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: (resolve: any) =>
            resolve({
              data: [
                { id: 'o-1', final_amount: 10000, status: 'COMPLETED', created_at: new Date().toISOString() },
                { id: 'o-2', final_amount: 20000, status: 'COMPLETED', created_at: new Date().toISOString() },
                { id: 'o-3', final_amount: 90000, status: 'COMPLETED', created_at: new Date().toISOString() },
              ],
              error: null,
            }),
        };
        return queryBuilder;
      }
      if (table === 'tables') {
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      }
      if (table === 'order_items') {
        return { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }) };
      }
      return {};
    });

    const result = await service.getDashboard('mock-token', ownerUser, undefined, 'today');

    expect(result.revenue).toBe(120000);
    expect(result.orders_count).toBe(3);
    // 120,000 / 3 = 40,000
    expect(result.average_order_value).toBe(40000);
  });

  it('5. Empty state: when no orders exist in selected branch/period, all metrics cleanly reset to zero', async () => {
    mockSupabaseUser.from.mockImplementation((table: string) => {
      if (table === 'branches') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: branchQ3, tenant_id: tenantId }, error: null }),
        };
      }
      if (table === 'orders') {
        const queryBuilder: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: (resolve: any) => resolve({ data: [], error: null }),
        };
        return queryBuilder;
      }
      if (table === 'tables') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {};
    });

    const result = await service.getDashboard('mock-token', ownerUser, branchQ3, 'today');

    expect(result.revenue).toBe(0);
    expect(result.orders_count).toBe(0);
    expect(result.average_order_value).toBe(0);
    expect(result.occupied_tables).toBe(0);
    expect(result.total_tables).toBe(0);
    expect(result.occupancy_rate).toBe(0);
    expect(result.top_products).toEqual([]);
    expect(result.payment_breakdown).toEqual([]);
    // All chart slots should have 0 revenue
    expect(result.chart_data.every((c) => c.revenue === 0)).toBe(true);
  });

  it('6. API error state: throws internal server error on database failure', async () => {
    mockSupabaseUser.from.mockImplementation(() => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: null, error: { message: 'DB connection timeout' } }),
      };
      return queryBuilder;
    });

    await expect(
      service.getDashboard('mock-token', ownerUser, undefined, 'today'),
    ).rejects.toThrow(AppException);
  });
});
