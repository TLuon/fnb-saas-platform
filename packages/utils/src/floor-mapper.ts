import { TableStatus } from './theme';

export function mapApiTableToCanvas(t: any) {
  return {
    id: t.id,
    name: t.name || t.table_code,
    status: (t.status as TableStatus) || 'AVAILABLE',
    coord_x: t.pos_x,
    coord_y: t.pos_y,
    width: t.width,
    height: t.height,
    shape: t.shape || 'rectangle',
    capacity: t.capacity || 4
  };
}
