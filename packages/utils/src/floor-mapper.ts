import { TableStatus } from './theme';

export function mapApiTableToCanvas(t: any) {
  let shapeStr = typeof t.shape === 'string' ? t.shape.toLowerCase() : 'rectangle';
  let rotation = typeof t.rotation === 'number' ? t.rotation : 0;
  
  if (shapeStr.includes(':')) {
    const parts = shapeStr.split(':');
    shapeStr = parts[0];
    rotation = parseInt(parts[1], 10) || 0;
  }

  return {
    id: t.id,
    name: t.name || t.table_code,
    status: (t.status as TableStatus) || 'AVAILABLE',
    coord_x: t.pos_x ?? t.coord_x,
    coord_y: t.pos_y ?? t.coord_y,
    width: t.width,
    height: t.height,
    shape: shapeStr as any,
    rotation: rotation,
    capacity: t.capacity ?? 4,
    reservation_time: t.reservation_time,
    reservation_code: t.reservation_code,
    customer_name: t.customer_name,
    customer_phone: t.customer_phone,
    deposit_amount: t.deposit_amount,
    current_order_id: t.current_order_id
  };
}
