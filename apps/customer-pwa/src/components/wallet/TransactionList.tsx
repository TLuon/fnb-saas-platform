import React from 'react';
import { ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { TransactionType } from './TransactionFilters';

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  created_at: string;
}

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getIcon = (type: TransactionType) => {
    switch (type) {
      case 'TOP_UP':
        return <div className="p-2 bg-[#E2F3E5] rounded-full text-[#237A57]"><ArrowUp size={20} /></div>;
      case 'PAYMENT':
        return <div className="p-2 bg-[#FEE4E2] rounded-full text-[#B42318]"><ArrowDown size={20} /></div>;
      case 'REFUND':
        return <div className="p-2 bg-[#FED8B1]/50 rounded-full text-[#D67D3E]"><RotateCcw size={20} /></div>;
      default:
        return null;
    }
  };

  const getAmountColor = (type: TransactionType) => {
    switch (type) {
      case 'TOP_UP': return 'text-[#237A57]';
      case 'PAYMENT': return 'text-[#222222]';
      case 'REFUND': return 'text-[#D67D3E]';
      default: return 'text-[#222222]';
    }
  };

  const getPrefix = (type: TransactionType) => {
    switch (type) {
      case 'TOP_UP': return '+';
      case 'PAYMENT': return '-';
      case 'REFUND': return '+';
      default: return '';
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-[#FFFFFF] p-8 rounded-xl border border-[#E8DED5] text-center shadow-sm">
        <p className="text-[#6B625B] font-bold">Không có giao dịch nào.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] rounded-xl border border-[#E8DED5] shadow-sm overflow-hidden">
      {transactions.map((t, i) => (
        <div key={t.id} className={`flex justify-between items-center p-4 ${i !== transactions.length - 1 ? 'border-b border-[#E8DED5]' : ''}`}>
          <div className="flex items-center gap-3">
            {getIcon(t.type)}
            <div>
              <p className="font-bold text-[#222222] text-sm">{t.description}</p>
              <p className="text-xs text-[#6B625B] mt-0.5">{new Date(t.created_at).toLocaleString('vi-VN')}</p>
            </div>
          </div>
          <div className={`font-bold text-sm ${getAmountColor(t.type)}`}>
            {getPrefix(t.type)}{formatPrice(t.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}
