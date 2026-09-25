import { describe, expect, it } from 'vitest';
import { buildOrderItemPayload, getSafeReturnUrl, unwrapOrderDetails } from './checkout';

describe('customer checkout integration helpers', () => {
  it('returns the protected cart URL after login', () => {
    expect(getSafeReturnUrl('?returnUrl=%2Fcart')).toBe('/cart');
  });

  it('rejects external return URLs', () => {
    expect(getSafeReturnUrl('?returnUrl=%2F%2Fevil.example')).toBe('/menu');
    expect(getSafeReturnUrl('?returnUrl=https%3A%2F%2Fevil.example')).toBe('/menu');
  });

  it('maps only fields accepted by AddOrderItemDto', () => {
    expect(buildOrderItemPayload({
      productId: 'product-1',
      quantity: 2,
      modifiers: ['Ít đá'],
      note: 'Không ống hút',
    }, 'Ghi chú chung')).toEqual({
      product_id: 'product-1',
      quantity: 2,
      modifiers: {
        selections: ['Ít đá'],
        note: 'Không ống hút',
      },
    });
  });

  it('unwraps the order shape returned by the shared API client', () => {
    const order = { id: 'order-1', final_amount: 32000, order_items: [{ id: 'item-1' }] };
    expect(unwrapOrderDetails({ order })).toEqual(order);
    expect(unwrapOrderDetails({ data: { order } })).toEqual(order);
  });
});
