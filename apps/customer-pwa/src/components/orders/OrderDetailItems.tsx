import React from 'react';

interface OrderDetailItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: string;
  note?: string;
}

interface OrderDetailItemsProps {
  items: OrderDetailItem[];
}

export function OrderDetailItems({ items }: OrderDetailItemsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-[#E8DED5]">
      <h3 className="font-bold text-[#543310] mb-3 text-sm">Danh sách món</h3>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex justify-between items-start border-b border-[#E8DED5] pb-4 last:border-0 last:pb-0">
            <div className="flex gap-3">
              <div className="w-6 font-bold text-[#543310]">{item.quantity}x</div>
              <div>
                <h4 className="font-bold text-[#222222] text-sm leading-tight">{item.name}</h4>
                {item.modifiers && <p className="text-[#6B625B] text-xs mt-1">{item.modifiers}</p>}
                {item.note && <p className="text-[#D67D3E] text-xs mt-1 italic">Ghi chú: {item.note}</p>}
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
