export type TableStatus = 'AVAILABLE' | 'PENDING_LOCK' | 'RESERVED' | 'OCCUPIED' | 'CLEANING';

export function getTableColor(status: TableStatus): string {
  switch (status) {
    case 'AVAILABLE': return '#dcfce7'; // xanh lá nhạt
    case 'PENDING_LOCK': return '#FED8B1'; // accent
    case 'RESERVED': return '#D67D3E'; // secondary / amber
    case 'OCCUPIED': return '#543310'; // primary
    case 'CLEANING': return '#E8DED5'; // xám trung tính (border color used as fill)
    default: return '#FAF7F3';
  }
}
