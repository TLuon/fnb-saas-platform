import React from 'react';
import { AddedByBadge } from './AddedByBadge';

export interface SharedCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: string;
  addedBy: string;
}

interface SharedCartPanelProps {
  items: SharedCartItem[];
}

export function SharedCartPanel({ items }: SharedCartPanelProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (items.length === 0) {
    return (
      <div className="bg-[#FFFFFF] p-8 rounded-xl border border-[#E8DED5] text-center">
        <p className="text-[#6B625B]">Giỏ hàng chung đang trống.</p>
        <p className="text-sm text-[#6B625B] mt-1">Hãy là người đầu tiên chọn món!</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] rounded-xl border border-[#E8DED5] overflow-hidden">
      <div className="p-3 bg-[#FAF7F3] border-b border-[#E8DED5]">
        <h3 className="font-bold text-[#543310] text-sm">Giỏ hàng chung</h3>
      </div>
      <div className="p-4 space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex justify-between items-start border-b border-[#E8DED5] pb-4 last:border-0 last:pb-0">
            <div className="flex gap-3">
              <div className="w-6 font-bold text-[#543310]">{item.quantity}x</div>
              <div>
                <h4 className="font-bold text-[#222222] text-sm leading-tight">{item.name}</h4>
                {item.modifiers && <p className="text-[#6B625B] text-xs mt-1">{item.modifiers}</p>}
                <AddedByBadge name={item.addedBy} />
              </div>
            </div>
            <div className="font-bold text-[#543310] text-sm">
              {formatPrice(item.price * item.quantity)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
