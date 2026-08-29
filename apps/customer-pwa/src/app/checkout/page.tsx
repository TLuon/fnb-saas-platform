'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cartStore';
import { useWalletStore } from '../../store/walletStore';
import { useCoffeePassStore } from '../../store/coffeePassStore';
import { useToast } from '../../components/ToastProvider';

export default function CheckoutPage() {
  const [method, setMethod] = useState<'vietqr' | 'wallet' | 'pass'>('vietqr');
  const [passId, setPassId] = useState<string>('');
  
  const total = useCartStore(state => state.totalPrice());
  const walletBalance = useWalletStore(state => state.getTotalBalance());
  const spendWallet = useWalletStore(state => state.spend);
  const { activePasses, useTicket } = useCoffeePassStore();
  
  const { showInfo, showError } = useToast();
  const router = useRouter();

  const handleCheckout = () => {
    if (total === 0) {
      showError('Giỏ hàng trống');
      return;
    }

    if (method === 'wallet') {
      const success = spendWallet(total, 'Thanh toán đơn hàng Cà phê');
      if (!success) {
        showError('Số dư ví không đủ!');
        return;
      }
    } else if (method === 'pass') {
      if (!passId) {
        showError('Vui lòng chọn 1 gói Coffee Pass');
        return;
      }
      const success = useTicket(passId);
      if (!success) {
        showError('Không thể sử dụng Coffee Pass này');
        return;
      }
    }

    showInfo('Thanh toán thành công!');
    setTimeout(() => {
      useCartStore.setState({ items: [] });
      router.push('/order-success');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F3] p-4">
      <h1 className="text-2xl font-bold text-[#543310] mb-6 border-b-2 border-[#D67D3E] inline-block pb-1">Thanh toán</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#FED8B1] mb-6 text-center">
        <h2 className="text-gray-600 mb-2 font-medium">Tổng thanh toán</h2>
        <p className="text-4xl font-bold text-[#543310]">{total.toLocaleString()} ₫</p>
      </div>

      <div className="space-y-4 mb-10">
        <h3 className="font-bold text-[#543310] text-lg">Phương thức</h3>
        
        <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition ${method === 'vietqr' ? 'border-[#D67D3E] bg-[#FED8B1]/30' : 'border-transparent bg-white shadow-sm hover:border-[#FED8B1]'}`}>
          <input type="radio" name="method" value="vietqr" checked={method === 'vietqr'} onChange={() => setMethod('vietqr')} className="mr-4 w-5 h-5 accent-[#D67D3E]" />
          <span className="font-bold text-[#543310]">Chuyển khoản VietQR</span>
        </label>
        
        <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition ${method === 'wallet' ? 'border-[#D67D3E] bg-[#FED8B1]/30' : 'border-transparent bg-white shadow-sm hover:border-[#FED8B1]'}`}>
          <input type="radio" name="method" value="wallet" checked={method === 'wallet'} onChange={() => setMethod('wallet')} className="mr-4 w-5 h-5 accent-[#D67D3E]" />
          <div className="flex flex-col">
            <span className="font-bold text-[#543310]">Ví trả trước</span>
            <span className={`text-xs font-medium ${walletBalance < total ? 'text-red-500' : 'text-[#D67D3E]'}`}>
              Số dư: {walletBalance.toLocaleString()} ₫
            </span>
          </div>
        </label>
        
        <div className={`p-4 border-2 rounded-xl transition ${method === 'pass' ? 'border-[#D67D3E] bg-[#FED8B1]/30' : 'border-transparent bg-white shadow-sm hover:border-[#FED8B1]'}`}>
          <label className="flex items-center cursor-pointer">
            <input type="radio" name="method" value="pass" checked={method === 'pass'} onChange={() => setMethod('pass')} className="mr-4 w-5 h-5 accent-[#D67D3E]" />
            <span className="font-bold text-[#543310]">Dùng Coffee Pass</span>
          </label>
          
          {method === 'pass' && (
            <div className="mt-4 pl-9">
              {activePasses.length === 0 ? (
                <p className="text-red-500 text-sm font-medium">Bạn không có Coffee Pass nào.</p>
              ) : (
                <select 
                  className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-[#D67D3E] bg-white text-[#543310]"
                  value={passId}
                  onChange={(e) => setPassId(e.target.value)}
                >
                  <option value="">-- Chọn gói Pass --</option>
                  {activePasses.map(pass => (
                    <option key={pass.id} value={pass.id} disabled={pass.remaining <= 0}>
                      {pass.name} (Còn {pass.remaining} ly)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={handleCheckout}
        disabled={(method === 'wallet' && walletBalance < total) || (method === 'pass' && activePasses.length === 0)}
        className="w-full bg-[#543310] text-[#FAF7F3] py-4 rounded-xl font-bold text-lg hover:bg-opacity-90 transition shadow-lg disabled:opacity-50"
      >
        Xác nhận thanh toán
      </button>
    </div>
  );
}
