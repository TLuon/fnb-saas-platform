import React from 'react';

const LEGENDS = [
  { status: 'AVAILABLE', label: 'Bàn trống', bg: '#E2F3E5', text: '#222222' },
  { status: 'PENDING_LOCK', label: 'Đang giữ', bg: '#FED8B1', text: '#543310' },
  { status: 'RESERVED', label: 'Đã đặt', bg: '#D67D3E', text: '#FFFFFF' },
  { status: 'OCCUPIED', label: 'Đang dùng', bg: '#543310', text: '#FFFFFF' },
  { status: 'CLEANING', label: 'Đang dọn', bg: '#E8DED5', text: '#6B625B' },
];

export function TableStatusLegend() {
  return (
    <div className="bg-[#FFFFFF] p-4 border border-[#E8DED5] rounded-xl shadow-sm mt-4">
      <h3 className="text-sm font-bold text-[#222222] mb-3">Chú thích trạng thái bàn</h3>
      <div className="flex flex-wrap gap-3">
        {LEGENDS.map(leg => (
          <div key={leg.status} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded" 
              style={{ backgroundColor: leg.bg, border: '1px solid rgba(0,0,0,0.1)' }}
            />
            <span className="text-sm text-[#6B625B]">{leg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
