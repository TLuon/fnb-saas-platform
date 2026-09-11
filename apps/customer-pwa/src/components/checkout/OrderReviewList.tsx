import React from 'react';

interface OrderReviewItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: string;
}

interface OrderReviewListProps {
  items: OrderReviewItem[];
}

export function OrderReviewList({ items }: OrderReviewListProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-[#E8DED5]">
      <h3 className="font-bold text-[#543310] mb-3 text-sm">Món đã chọn</h3>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex justify-between items-start text-sm pb-3 border-b border-[#E8DED5] last:border-0 last:pb-0">
            <div className="flex gap-2">
              <span className="font-bold text-[#543310] w-6">{item.quantity}x</span>
              <div>
                <p className="font-bold text-[#222222]">{item.name}</p>
                {item.modifiers && <p className="text-[#6B625B] text-xs mt-1">{item.modifiers}</p>}
              </div>
            </div>
            <span className="font-bold text-[#543310]">{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
