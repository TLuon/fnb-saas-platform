export interface KdsSnapshotItem {
  order_item_id: string;
  order_id: string;
  order_code?: string;
  product_name: string;
  quantity: number;
  kitchen_status?: 'QUEUED' | 'PREPARING' | 'READY' | 'SERVED';
  created_at?: string;
  station?: 'KITCHEN' | 'BAR';
  order_type?: 'DINE_IN' | 'TAKEAWAY';
  table_code?: string | null;
  table_name?: string | null;
  note?: string;
  modifiers?: Record<string, string>;
}

export function mapKdsSnapshot(items: KdsSnapshotItem[], fallbackStation: 'KITCHEN' | 'BAR') {
  return items.map((item) => ({
    id: item.order_item_id,
    orderId: item.order_id,
    orderCode: item.order_code || (item.order_id ? 'ORD-' + item.order_id.slice(0, 6).toUpperCase() : ''),
    name: item.product_name,
    quantity: item.quantity,
    kitchen_status: item.kitchen_status || 'QUEUED',
    createdAt: new Date(item.created_at || Date.now()).getTime(),
    station: item.station || fallbackStation,
    orderType: item.order_type || 'DINE_IN',
    tableName: item.table_code || item.table_name || '',
    note: item.note,
    modifiers: item.modifiers,
  }));
}

export function getSocketBaseUrl(apiUrl: string) {
  return apiUrl.replace(/\/api\/v1\/?$/, '');
}
