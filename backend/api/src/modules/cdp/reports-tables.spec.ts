import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CdpService } from './cdp.service.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';

describe('CdpService - getOccupiedTables', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const owner: AuthenticatedUser = {
    sub: 'owner-user',
    tenant_id: tenantId,
    branch_id: null,
    role_app: 'OWNER',
    email: 'owner@example.com',
  };
  let client: any;
  let service: CdpService;

  beforeEach(() => {
    client = { from: vi.fn() };
    service = new CdpService({ forUser: () => client } as any);
  });

  it('returns occupied tables list with floor, branch, and current order details', async () => {
    const filters: Array<[string, unknown]> = [];
    const tablesQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: unknown) => {
        filters.push([field, value]);
        return tablesQuery;
      }),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'table-1',
            table_code: 'Bàn 01',
            capacity: 4,
            status: 'OCCUPIED',
            current_order_id: 'order-101',
            updated_at: '2026-09-24T10:00:00Z',
            floors: {
              id: 'floor-1',
              name: 'Tầng 1',
              branch_id: 'branch-1',
              branches: { id: 'branch-1', name: 'Chi nhánh Quận 1' },
            },
          },
        ],
        error: null,
      }),
    };

    const ordersQuery: any = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'order-101',
            order_code: 'ORD-999',
            order_type: 'DINE_IN',
            final_amount: 150000,
            status: 'PREPARING',
            created_at: '2026-09-24T10:15:00Z',
          },
        ],
        error: null,
      }),
    };

    client.from.mockImplementation((table: string) => {
      if (table === 'tables') return tablesQuery;
      if (table === 'orders') return ordersQuery;
      return {};
    });

    const result = await service.getOccupiedTables('token', owner);

    expect(client.from).toHaveBeenCalledWith('tables');
    expect(filters).toContainEqual(['status', 'OCCUPIED']);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'table-1',
      table_code: 'Bàn 01',
      capacity: 4,
      status: 'OCCUPIED',
      floor_id: 'floor-1',
      floor_name: 'Tầng 1',
      branch_id: 'branch-1',
      branch_name: 'Chi nhánh Quận 1',
      current_order_id: 'order-101',
      order: {
        id: 'order-101',
        order_code: 'ORD-999',
        order_type: 'DINE_IN',
        final_amount: 150000,
        status: 'PREPARING',
        created_at: '2026-09-24T10:15:00Z',
      },
      updated_at: '2026-09-24T10:00:00Z',
    });
  });

  it('filters tables by branch_id if provided', async () => {
    const branchId = '22222222-2222-2222-2222-222222222222';
    const filters: Array<[string, unknown]> = [];

    const branchQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: branchId },
        error: null,
      }),
    };

    const tablesQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: unknown) => {
        filters.push([field, value]);
        return tablesQuery;
      }),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    client.from.mockImplementation((table: string) => {
      if (table === 'branches') return branchQuery;
      if (table === 'tables') return tablesQuery;
      return {};
    });

    const result = await service.getOccupiedTables('token', owner, branchId, 'OCCUPIED');

    expect(filters).toContainEqual(['status', 'OCCUPIED']);
    expect(filters).toContainEqual(['floors.branch_id', branchId]);
    expect(result).toEqual([]);
  });
});
