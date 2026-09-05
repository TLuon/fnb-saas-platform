'use client';

import React, { useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useGroupCartStore } from '../../store/groupCartStore';
import { useGroupOrder } from '../../hooks/useGroupOrder';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/ToastProvider';

export default function CartPage() {
  const [activeTab, setActiveTab] = useState<'personal' | 'group'>('personal');
  const personalItems = useCartStore(state => state.items);
  const personalTotal = useCartStore(state => state.totalPrice());
  const removeItem = useCartStore(state => state.removeItem);
  
  const groupItems = useGroupCartStore(state => state.items);
  const groupTotal = groupItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const router = useRouter();
  const { showInfo } = useToast();

  useGroupOrder('1');

  const handleCheckout = () => {
    if (activeTab === 'personal' && personalItems.length === 0) return;
    if (activeTab === 'group' && groupItems.length === 0) return;
    router.push('/checkout');
  };

  const handleSyncToGroup = () => {
    showInfo('Đã đồng bộ món của bạn lên giỏ hàng chung');
  };

  const displayItems = activeTab === 'personal' ? personalItems : groupItems;
  const displayTotal = activeTab === 'personal' ? personalTotal : groupTotal;

  return (
    <div className="min-h-screen bg-[#FAF7F3] p-4 flex flex-col">
      <h1 className="text-2xl font-bold text-[#543310] mb-4 border-b-2 border-[#D67D3E] inline-block pb-1">Giỏ hàng</h1>
      
      <div className="flex bg-white rounded-lg p-1 mb-6 shadow-sm border border-[#FED8B1]">
        <button 
          className={`flex-1 py-2 font-medium rounded-md transition ${activeTab === 'personal' ? 'bg-[#543310] text-[#FAF7F3]' : 'text-gray-500'}`}
          onClick={() => setActiveTab('personal')}
        >
          Cá nhân
        </button>
        <button 
          className={`flex-1 py-2 font-medium rounded-md transition ${activeTab === 'group' ? 'bg-[#543310] text-[#FAF7F3]' : 'text-gray-500'}`}
          onClick={() => setActiveTab('group')}
        >
          Nhóm (Bàn 1)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-40">
        {displayItems.length === 0 ? (
          <p className="text-center text-gray-500 mt-10">Giỏ hàng trống.</p>
        ) : (
          <ul className="space-y-4">
            {displayItems.map((item, idx) => (
              <li key={`${item.id}-${idx}`} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-[#543310]">{item.name} <span className="text-sm font-normal text-gray-500">x{item.quantity}</span></h3>
                  <p className="text-[#D67D3E] font-medium">{(item.price * item.quantity).toLocaleString()} ₫</p>
                  {activeTab === 'group' && item.addedBy && (
                    <p className="text-xs mt-2 text-[#543310] font-bold bg-[#FED8B1] inline-block px-2 py-1 rounded-md">
                      Bởi: {item.addedBy}
                    </p>
                  )}
                </div>
                {activeTab === 'personal' && (
                  <button onClick={() => removeItem(item.id)} className="text-red-500 text-sm font-medium p-2 hover:bg-red-50 rounded">
                    Xóa
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] z-50">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600 font-medium">Tổng cộng:</span>
          <span className="font-bold text-2xl text-[#543310]">{displayTotal.toLocaleString()} ₫</span>
        </div>
        
        <div className="flex gap-3">
          {activeTab === 'personal' && (
            <button 
              onClick={handleSyncToGroup}
              className="flex-1 bg-[#FED8B1] text-[#543310] py-3 rounded-lg font-bold hover:bg-[#D67D3E] hover:text-white transition"
            >
              Gửi vào chung
            </button>
          )}
          <button 
            onClick={handleCheckout}
            disabled={displayItems.length === 0}
            className="flex-1 bg-[#543310] text-[#FAF7F3] py-3 rounded-lg font-bold hover:bg-opacity-90 transition disabled:opacity-50"
          >
            Thanh toán {activeTab === 'group' ? 'Nhóm' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
