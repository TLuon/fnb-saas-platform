import React from 'react';
import { Trash2, Minus, Plus, AlertTriangle } from 'lucide-react';
import { CartItem } from '../../stores/cartStore';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}

export function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  const isAvailable = item.isAvailable !== false;

  return (
    <div className={`bg-[#FFFFFF] p-4 rounded-xl shadow-sm border flex gap-4 ${!isAvailable ? 'border-[#B42318] bg-[#FEE4E2]' : 'border-[#E8DED5]'}`}>
      <div className="w-20 h-20 bg-[#FAF7F3] rounded-lg overflow-hidden shrink-0">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#E8DED5]">
            Logo
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h3 className={`font-bold ${!isAvailable ? 'text-[#B42318]' : 'text-[#222222]'}`}>{item.name}</h3>
            {item.modifiers && <p className="text-sm text-[#6B625B] mt-1">{item.modifiers}</p>}
            {item.note && <p className="text-sm text-[#D67D3E] italic mt-1 text-ellipsis overflow-hidden">Ghi chú: {item.note}</p>}
          </div>
          <button 
            onClick={() => onRemove(item.id)}
            className="text-[#6B625B] hover:text-[#B42318] p-1 shrink-0 transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {!isAvailable && (
          <div className="flex items-center gap-1 text-[#B42318] text-xs font-bold mt-2">
            <AlertTriangle size={14} /> Món này hiện đã hết hàng
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="font-bold text-[#543310]">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
          </div>
          
          <div className="flex items-center gap-3 bg-[#FAF7F3] border border-[#E8DED5] rounded-full p-1">
            <button 
              onClick={() => onUpdateQuantity(item.id, -1)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-[#543310] shadow-sm active:scale-95 transition-transform"
            >
              <Minus size={16} />
            </button>
            <span className="font-bold text-[#222222] min-w-[1ch] text-center">{item.quantity}</span>
            <button 
              onClick={() => onUpdateQuantity(item.id, 1)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-[#543310] text-white shadow-sm active:scale-95 transition-transform"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
