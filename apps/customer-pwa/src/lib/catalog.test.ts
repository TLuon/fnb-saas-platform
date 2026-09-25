import { describe, expect, it } from 'vitest';
import { normalizePublicCatalog } from './catalog';

describe('normalizePublicCatalog', () => {
  it('maps the real public catalog response and price field', () => {
    const result = normalizePublicCatalog({
      categories: [{ id: 'drinks', name: 'Đồ uống' }],
      products: [{ id: 'coffee', category_id: 'drinks', name: 'Bạc xỉu', price: 32000 }],
    });

    expect(result.categories).toEqual([{ id: 'drinks', name: 'Đồ uống', kitchen_station: undefined }]);
    expect(result.products[0]).toMatchObject({
      id: 'coffee',
      category_id: 'drinks',
      name: 'Bạc xỉu',
      base_price: 32000,
    });
  });

  it('supports grouped legacy responses without rendering categories as products', () => {
    const result = normalizePublicCatalog([
      { id: 'food', name: 'Đồ ăn', items: [{ id: 'bread', name: 'Bánh mì', base_price: 25000 }] },
    ]);

    expect(result.categories).toHaveLength(1);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].category_id).toBe('food');
  });

  it('drops malformed products instead of producing NaN prices', () => {
    const result = normalizePublicCatalog({
      categories: [],
      products: [{ id: 'broken', name: 'Thiếu giá' }],
    });

    expect(result.products).toEqual([]);
  });
});
