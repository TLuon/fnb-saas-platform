'use client';
import React, { useState } from 'react';
import { useWalletStore } from '../../store/walletStore';
import { useToast } from '../../components/ToastProvider';

export default function WalletPage() {
  const { mainBalance, promoBalance, history, getTotalBalance, topUp } = useWalletStore();
  const { showInfo } = useToast();
  const [showTopUp, setShowTopUp] = useState(false);
  const [amount, setAmount] = useState('');

  const handleTopUp = () => {
    const val = parseInt(amount, 10);
    if (!val || val <= 0) return;
    topUp(val, 'Nạp tiền qua VietQR');
    showInfo(`Nạp thành công ${val.toLocaleString()} ₫`);
    setShowTopUp(false);
    setAmount('');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F3] p-4 pb-20">
      <h1 className="text-2xl font-bold text-[#543310] mb-6 border-b-2 border-[#D67D3E] inline-block pb-1">Ví của tôi</h1>
      
      <div className="bg-gradient-to-br from-[#FED8B1] to-[#D67D3E] p-6 rounded-2xl shadow-md text-[#543310] mb-8 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl"></div>
        <h2 className="font-medium opacity-90 mb-1">Tổng số dư</h2>
        <p className="text-4xl font-bold mb-4">{getTotalBalance().toLocaleString()} ₫</p>
        <div className="flex flex-col gap-1 text-sm font-bold opacity-80 border-t border-[#543310]/20 pt-3 mt-3">
          <div className="flex justify-between">
            <span>Số dư chính:</span>
            <span>{mainBalance.toLocaleString()} ₫</span>
          </div>
          <div className="flex justify-between">
            <span>Khuyến mãi:</span>
            <span>{promoBalance.toLocaleString()} ₫</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setShowTopUp(true)}
          className="flex-1 bg-[#543310] text-[#FAF7F3] py-4 rounded-xl font-bold shadow-lg hover:bg-opacity-90 transition text-lg"
        >
          Nạp tiền
        </button>
      </div>

      {showTopUp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl border border-[#FED8B1]">
            <h3 className="font-bold text-[#543310] text-xl mb-4">Nạp tiền vào ví</h3>
            <input 
              type="number" 
              placeholder="Nhập số tiền (VNĐ)..." 
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border-2 border-gray-200 p-4 rounded-xl mb-6 focus:ring-4 focus:ring-[#FED8B1] focus:border-[#D67D3E] outline-none transition text-lg font-bold text-[#543310]"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowTopUp(false)} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition">Hủy</button>
              <button onClick={handleTopUp} className="flex-1 bg-[#543310] text-[#FAF7F3] py-3 rounded-xl font-bold hover:bg-[#D67D3E] transition">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      <h3 className="font-bold text-[#543310] mb-4 text-lg">Lịch sử giao dịch</h3>
      {history.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Chưa có giao dịch nào.</p>
      ) : (
        <ul className="space-y-3">
          {history.map(tx => (
            <li key={tx.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition hover:border-[#FED8B1]">
              <div>
                <p className="font-bold text-[#543310]">{tx.description}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">{new Date(tx.timestamp).toLocaleString()}</p>
              </div>
              <span className={`font-bold text-lg ${tx.amount > 0 ? 'text-green-600' : 'text-[#D67D3E]'}`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} ₫
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
