import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CdpService } from './cdp.service.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';

describe('CdpService - revenue order details', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const owner: AuthenticatedUser = {
    sub: 'owner-user', tenant_id: tenantId, branch_id: null, role_app: 'OWNER', email: 'owner@example.com',
  };
  let client: any;
  let service: CdpService;

  beforeEach(() => {
    client = { from: vi.fn() };
    service = new CdpService({ forUser: () => client } as any);
  });

  it('returns only completed tenant orders from the requested period', async () => {
    const filters: Array<[string, unknown]> = [];
    const query: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: unknown) => { filters.push([field, value]); return query; }),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{
          id: 'order-1', order_code: 'ORD-001', final_amount: 90000,
          customers: { full_name: 'Nguyễn An' },
          order_items: [{ id: 'item-1', product_name: 'Bạc xỉu', quantity: 2, unit_price: 50000 }],
        }],
        error: null,
      }),
    };
    client.from.mockReturnValue(query);

    const result = await service.getRevenueOrders('token', owner, undefined, 'today');

    expect(client.from).toHaveBeenCalledWith('orders');
    expect(filters).toContainEqual(['tenant_id', tenantId]);
    expect(filters).toContainEqual(['status', 'COMPLETED']);
    expect(query.gte).toHaveBeenCalledWith('created_at', expect.any(String));
    expect(query.lte).toHaveBeenCalledWith('created_at', expect.any(String));
    expect(result).toHaveLength(1);
    expect(result[0].order_items[0].product_name).toBe('Bạc xỉu');
  });

  it('returns an empty list when the period has no completed orders', async () => {
    const query: any = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    client.from.mockReturnValue(query);

    await expect(service.getRevenueOrders('token', owner, undefined, 'today')).resolves.toEqual([]);
  });
});
