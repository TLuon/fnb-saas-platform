import React from 'react';

export type TransactionType = 'ALL' | 'TOP_UP' | 'PAYMENT' | 'REFUND';

interface TransactionFiltersProps {
  filter: TransactionType;
  onChange: (filter: TransactionType) => void;
}

export function TransactionFilters({ filter, onChange }: TransactionFiltersProps) {
  const tabs: { id: TransactionType; label: string }[] = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'TOP_UP', label: 'Nạp tiền' },
    { id: 'PAYMENT', label: 'Thanh toán' },
    { id: 'REFUND', label: 'Hoàn tiền' }
  ];

  return (
    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-none px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${
            filter === tab.id 
              ? 'bg-[#543310] text-[#FED8B1] shadow-sm' 
              : 'bg-[#FFFFFF] border border-[#E8DED5] text-[#6B625B] hover:bg-[#FAF7F3]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
