import React from 'react';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export function EmptyCartState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-[50vh]">
      <div className="w-24 h-24 bg-[#E8DED5] rounded-full flex items-center justify-center mb-6">
        <ShoppingBag size={48} className="text-[#6B625B]" />
      </div>
      <h2 className="text-xl font-bold text-[#543310] mb-2">Chưa có món nào</h2>
      <p className="text-[#6B625B] mb-8 max-w-[250px]">
        Giỏ hàng của bạn đang trống. Hãy chọn vài món ngon để thưởng thức nhé!
      </p>
      <Link 
        href="/menu"
        className="px-8 py-3 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#D67D3E] transition-colors shadow-sm"
      >
        Xem menu
      </Link>
    </div>
  );
}
