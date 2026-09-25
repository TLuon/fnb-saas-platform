import { describe, expect, it, vi } from 'vitest';
import { CdpService } from './cdp.service.js';

const owner = {
  sub: 'owner-1',
  role_app: 'OWNER' as const,
  tenant_id: 'tenant-1',
  branch_id: 'branch-1',
};

function makeCustomerQuery(customer: { id: string } | null) {
  const query: any = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.maybeSingle = vi.fn().mockResolvedValue({ data: customer, error: null });
  return query;
}

function makeVoucherQuery() {
  const query: any = {};
  query.insert = vi.fn(() => query);
  query.select = vi.fn(() => query);
  query.single = vi.fn().mockResolvedValue({
    data: { id: 'voucher-1', customer_id: 'customer-1', discount_percent: 10 },
    error: null,
  });
  return query;
}

describe('CdpService.createVoucher', () => {
  it('checks customer tenant ownership before using the service client to insert', async () => {
    const customerQuery = makeCustomerQuery({ id: 'customer-1' });
    const voucherQuery = makeVoucherQuery();
    const admin = {
      from: vi.fn((table: string) => table === 'customers' ? customerQuery : voucherQuery),
    };
    const service = new CdpService({ admin: () => admin } as any);

    const result = await service.createVoucher(owner, 'customer-1', { discount_percent: 10 });

    expect(customerQuery.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    expect(voucherQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      customer_id: 'customer-1',
      source: 'MANUAL',
      discount_percent: 10,
    }));
    expect(result.id).toBe('voucher-1');
  });

  it('does not insert when the customer is outside the authenticated tenant', async () => {
    const customerQuery = makeCustomerQuery(null);
    const voucherQuery = makeVoucherQuery();
    const admin = {
      from: vi.fn((table: string) => table === 'customers' ? customerQuery : voucherQuery),
    };
    const service = new CdpService({ admin: () => admin } as any);

    await expect(service.createVoucher(owner, 'other-customer', { discount_percent: 10 }))
      .rejects.toThrow('Không tìm thấy khách hàng trong tenant hiện tại');
    expect(voucherQuery.insert).not.toHaveBeenCalled();
  });
});
