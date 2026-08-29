'use client';
import React from 'react';
import { useCartStore } from '../../store/cartStore';
import { useToast } from '../../components/ToastProvider';
import { useRouter } from 'next/navigation';

const MOCK_MENU = [
  { id: 'm1', name: 'Cà phê Đen Đá', price: 29000, category: 'Cà phê' },
  { id: 'm2', name: 'Bạc Xỉu', price: 35000, category: 'Cà phê' },
  { id: 'm3', name: 'Trà Đào Cam Sả', price: 45000, category: 'Trà' },
  { id: 'm4', name: 'Bánh Sừng Trâu', price: 30000, category: 'Bánh' },
];

export default function MenuPage() {
  const addItem = useCartStore(state => state.addItem);
  const cartItemsCount = useCartStore(state => state.items.reduce((acc, i) => acc + i.quantity, 0));
  const { showInfo } = useToast();
  const router = useRouter();

  const handleAdd = (item: any) => {
    addItem({ ...item, quantity: 1 });
    showInfo(`Đã thêm ${item.name} vào giỏ`);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F3] p-4 pb-24">
      <h1 className="text-2xl font-bold text-[#543310] mb-6 border-b-2 border-[#D67D3E] inline-block pb-1">Thực Đơn</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_MENU.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition hover:border-[#FED8B1]">
            <div>
              <h3 className="font-bold text-[#543310]">{item.name}</h3>
              <p className="text-[#D67D3E] font-medium">{item.price.toLocaleString()} ₫</p>
            </div>
            <button 
              onClick={() => handleAdd(item)}
              className="bg-[#543310] text-[#FAF7F3] px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition"
            >
              Thêm
            </button>
          </div>
        ))}
      </div>

      {cartItemsCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex justify-between items-center z-50">
          <span className="font-bold text-[#543310]">Giỏ hàng: {cartItemsCount} món</span>
          <button 
            onClick={() => router.push('/cart')}
            className="bg-[#D67D3E] text-white px-6 py-2 rounded-xl font-bold hover:bg-opacity-90 transition"
          >
            Xem giỏ hàng
          </button>
        </div>
      )}
    </div>
  );
}
