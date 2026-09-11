import React from 'react';
import { Ticket } from 'lucide-react';
import Link from 'next/link';
import { VoucherStatusBadge, VoucherStatus } from './VoucherStatusBadge';

interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  expires_at: string;
  status?: VoucherStatus;
}

interface VoucherListProps {
  vouchers: Voucher[];
}

export function VoucherList({ vouchers }: VoucherListProps) {
  if (vouchers.length === 0) {
    return (
      <div className="bg-[#FFFFFF] p-8 rounded-xl border border-[#E8DED5] text-center shadow-sm">
        <p className="text-[#6B625B] font-bold">Bạn chưa có voucher nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vouchers.map(v => (
        <div key={v.id} className={`bg-white rounded-xl border border-[#E8DED5] shadow-sm flex overflow-hidden ${v.status === 'USED' || v.status === 'EXPIRED' ? 'opacity-70 grayscale-[0.3]' : ''}`}>
          <div className="w-16 bg-[#FED8B1]/30 flex flex-col items-center justify-center border-r border-[#E8DED5] border-dashed relative">
            <div className="absolute top-0 -mt-2 w-4 h-4 rounded-full bg-[#FAF7F3]"></div>
            <div className="absolute bottom-0 -mb-2 w-4 h-4 rounded-full bg-[#FAF7F3]"></div>
            <Ticket className="text-[#D67D3E]" size={24} />
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-1 gap-2">
                <h3 className="font-bold text-[#543310] text-sm leading-tight">{v.title}</h3>
                <VoucherStatusBadge status={v.status || 'ACTIVE'} />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] bg-[#E8DED5] text-[#6B625B] px-1.5 py-0.5 rounded font-bold uppercase">{v.code}</span>
              </div>
              <p className="text-xs text-[#6B625B] mt-1">{v.description}</p>
            </div>
            
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E8DED5]">
              <span className="text-[11px] text-[#6B625B]">HSD: {new Date(v.expires_at).toLocaleDateString('vi-VN')}</span>
              {v.status === 'ACTIVE' || !v.status ? (
                <Link href="/menu" className="text-xs font-bold text-[#D67D3E] hover:underline">
                  Dùng ngay
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
