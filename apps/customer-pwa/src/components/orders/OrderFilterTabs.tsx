import React from 'react';

export type OrderFilter = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

interface OrderFilterTabsProps {
  filter: OrderFilter;
  onChange: (filter: OrderFilter) => void;
}

export function OrderFilterTabs({ filter, onChange }: OrderFilterTabsProps) {
  const tabs: { id: OrderFilter; label: string }[] = [
    { id: 'ACTIVE', label: 'Đang xử lý' },
    { id: 'COMPLETED', label: 'Lịch sử' },
    { id: 'CANCELLED', label: 'Đã hủy' }
  ];

  return (
    <div className="flex gap-2 mb-4 bg-white p-2 rounded-xl shadow-sm border border-[#E8DED5]">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors ${
            filter === tab.id 
              ? 'bg-[#D67D3E] text-white shadow-sm' 
              : 'text-[#6B625B] hover:bg-[#FAF7F3]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
