import React from 'react';

export type VoucherStatus = 'ACTIVE' | 'USED' | 'EXPIRED';

interface VoucherStatusBadgeProps {
  status: VoucherStatus;
}

export function VoucherStatusBadge({ status }: VoucherStatusBadgeProps) {
  if (status === 'ACTIVE') {
    return <span className="px-2 py-0.5 bg-[#E2F3E5] text-[#237A57] text-[10px] font-bold rounded uppercase">Khả dụng</span>;
  }
  
  if (status === 'USED') {
    return <span className="px-2 py-0.5 bg-[#E8DED5] text-[#6B625B] text-[10px] font-bold rounded uppercase">Đã dùng</span>;
  }
  
  return <span className="px-2 py-0.5 bg-[#FEE4E2] text-[#B42318] text-[10px] font-bold rounded uppercase">Hết hạn</span>;
}
