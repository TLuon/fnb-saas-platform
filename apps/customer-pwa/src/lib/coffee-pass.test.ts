import { describe, expect, it } from 'vitest';
import { extractSubscription, normalizePassPlans, normalizeWalletBalance } from './coffee-pass';

describe('coffee pass API mapping', () => {
  it('unwraps the plans object and maps valid_days to the UI model', () => {
    expect(normalizePassPlans({
      plans: [{ id: 'plan-1', name: 'Gói 10 ly', price: '150000', total_redemptions: 10, valid_days: 30 }],
    })).toEqual([{
      id: 'plan-1', name: 'Gói 10 ly', price: 150000, total_redemptions: 10,
      duration_days: 30, description: undefined,
    }]);
  });

  it('returns an empty list for null and malformed responses', () => {
    expect(normalizePassPlans(null)).toEqual([]);
    expect(normalizePassPlans({ plans: {} })).toEqual([]);
  });

  it('uses actual wallet fields without inventing a fallback balance', () => {
    expect(normalizeWalletBalance({ main_balance: '200000', promo_balance: '50000' })).toBe(250000);
    expect(normalizeWalletBalance(null)).toBe(0);
  });

  it('extracts the subscription from an API envelope', () => {
    expect(extractSubscription({ data: { subscription: { id: 'sub-1' } } })).toEqual({ id: 'sub-1' });
  });
});
