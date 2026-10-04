import React from 'react';
import { QrCode, Wallet, Coffee, Banknote } from 'lucide-react';

export type PaymentMethod = 'VIETQR' | 'WALLET' | 'COFFEE_PASS' | 'CASH';

interface PaymentMethodSelectorProps {
  method: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({ method, onChange }: PaymentMethodSelectorProps) {
  const methods = [
    { id: 'VIETQR', label: 'Chuyển khoản (VietQR)', icon: <QrCode size={20} /> },
    { id: 'WALLET', label: 'Ví FNB', icon: <Wallet size={20} /> },
    { id: 'COFFEE_PASS', label: 'Gói Coffee Pass', icon: <Coffee size={20} /> },
    { id: 'CASH', label: 'Tiền mặt (Tại quầy)', icon: <Banknote size={20} /> }
  ];

  return (
    <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-[#E8DED5]">
      <h3 className="font-bold text-[#543310] mb-3 text-sm">Phương thức thanh toán</h3>
      <div className="space-y-3">
        {methods.map(m => {
          const isActive = method === m.id;
          return (
            <label 
              key={m.id} 
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                isActive ? 'border-[#D67D3E] bg-[#FED8B1]/20' : 'border-[#E8DED5] hover:bg-[#FAF7F3]'
              }`}
            >
              <input 
                type="radio" 
                name="payment_method" 
                value={m.id} 
                checked={isActive} 
                onChange={() => onChange(m.id as PaymentMethod)}
                className="text-[#D67D3E] focus:ring-[#D67D3E]"
              />
              <div className={`w-8 h-8 rounded bg-white flex items-center justify-center shadow-sm ${isActive ? 'text-[#D67D3E]' : 'text-[#6B625B]'}`}>
                {m.icon}
              </div>
              <span className={`font-bold text-sm ${isActive ? 'text-[#543310]' : 'text-[#222222]'}`}>
                {m.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
