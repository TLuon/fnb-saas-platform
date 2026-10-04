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
      <h3 className="font-bold text-[#543310] mb-3 text-sm">Danh sách món ({items.length})</h3>
      <div className="space-y-4">
        {items.map((item: any) => {
          const name = item.product_name || item.name || 'Món ăn';
          const price = Number(item.unit_price || item.price || 0);
          const qty = Number(item.quantity || 1);
          const itemTotal = price * qty;
          const modifiersText = typeof item.modifiers === 'object' && item.modifiers !== null
            ? Object.values(item.modifiers).join(', ')
            : String(item.modifiers || '');

          return (
            <div key={item.id} className="flex justify-between items-start border-b border-[#E8DED5] pb-4 last:border-0 last:pb-0">
              <div className="flex gap-3">
                <div className="w-6 font-bold text-[#543310]">{qty}x</div>
                <div>
                  <h4 className="font-bold text-[#222222] text-sm leading-tight">{name}</h4>
                  {modifiersText && <p className="text-[#6B625B] text-xs mt-1">{modifiersText}</p>}
                  {item.note && <p className="text-[#D67D3E] text-xs mt-1 italic">Ghi chú: {item.note}</p>}
                </div>
              </div>
              <div className="font-bold text-[#543310] text-sm">
                {formatPrice(itemTotal)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
