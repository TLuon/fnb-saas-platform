export type TableStatus = 'AVAILABLE' | 'PENDING_LOCK' | 'RESERVED' | 'OCCUPIED' | 'CLEANING';

export function getTableColor(status: TableStatus): string {
  switch (status) {
    case 'AVAILABLE': return '#FED8B1';
    case 'PENDING_LOCK': return '#D67D3E';
    case 'RESERVED': return '#543310';
    case 'OCCUPIED': return '#543310';
    case 'CLEANING': return '#FAF7F3';
    default: return '#FAF7F3';
  }
}
