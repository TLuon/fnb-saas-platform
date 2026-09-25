import { describe, expect, it } from 'vitest';
import { getSocketBaseUrl, mapKdsSnapshot } from './kds';

describe('KDS API mapping', () => {
  it('maps the order_item_id and table_code returned by the backend', () => {
    const [item] = mapKdsSnapshot([{
      order_item_id: 'item-1',
      order_id: 'order-1',
      product_name: 'Bánh croissant',
      quantity: 1,
      kitchen_status: 'QUEUED',
      table_code: 'B02',
    }], 'KITCHEN');

    expect(item.id).toBe('item-1');
    expect(item.tableName).toBe('B02');
    expect(item.station).toBe('KITCHEN');
  });

  it('connects Socket.IO to the server root instead of the REST prefix', () => {
    expect(getSocketBaseUrl('http://localhost:3001/api/v1')).toBe('http://localhost:3001');
  });
});
