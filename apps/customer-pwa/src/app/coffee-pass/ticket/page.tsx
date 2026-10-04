'use client';
import React, { useState, useEffect } from 'react';
import { generateTOTP, getTOTPRemainingSeconds } from '@fnb/utils';
import { useCoffeePassStore } from '../../../store/coffeePassStore';
import { useRouter } from 'next/navigation';

export default function CoffeePassTicketPage() {
  const [code, setCode] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const { activePasses } = useCoffeePassStore();
  const router = useRouter();
  const pass = activePasses[0]; 

  useEffect(() => {
    if (!pass) {
      router.replace('/coffee-pass');
      return;
    }

    const updateTOTP = () => {
      setCode(generateTOTP(pass.id));
      setRemainingSeconds(getTOTPRemainingSeconds());
    };

    updateTOTP();
    const interval = setInterval(updateTOTP, 1000);
    return () => clearInterval(interval);
  }, [pass, router]);

  if (!pass) return null;

  return (
    <div className="min-h-screen bg-[#543310] p-6 flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold text-[#FED8B1] mb-2">Thẻ Coffee Pass</h1>
      <p className="text-[#FAF7F3] opacity-80 mb-8">{pass.name} (Còn {pass.remaining}/{pass.totalLimit})</p>

      <div className="ticket-punch bg-white rounded-3xl p-8 max-w-sm mx-auto shadow-2xl relative border-2 border-[#D67D3E] overflow-hidden">
        <div 
          className="absolute top-0 left-0 w-full h-4 opacity-30"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #D67D3E 10px, #D67D3E 20px)' }}
        ></div>
        
        <div className="text-center mb-8 pt-4">
          <h2 className="text-3xl font-black font-serif text-[#543310]">F&B Pass</h2>
          <p className="text-sm font-semibold tracking-widest text-[#D67D3E] uppercase mt-1">Trà đá / Trà chanh</p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="flex gap-4">
            {[1, 2, 3].map((num) => (
              <div 
                key={num}
                className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shadow-inner ${
                  num > (pass.totalLimit - pass.remaining) 
                    ? 'bg-gray-100 text-gray-300' 
                    : 'bg-gradient-to-br from-[#D67D3E] to-[#a85923] text-white shadow-md'
                }`}
              >
                {num <= (pass.totalLimit - pass.remaining) ? '✓' : num}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-8 relative">
          <div className="bg-[#FAF7F3] py-4 rounded-xl shadow-inner border border-gray-200">
            <p className="text-sm text-gray-500 font-semibold mb-2 uppercase tracking-widest">Mã Nhận Nước</p>
            <p className="text-5xl font-black font-serif text-[#543310] tracking-[0.2em]">{code}</p>
          </div>
          
          <div className="mt-6 flex flex-col items-center">
            <p className="text-xs text-gray-500 font-bold mb-2 uppercase">Mã thay đổi sau {remainingSeconds}s</p>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-[#D67D3E] h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(remainingSeconds / 30) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 font-medium">
          Đưa mã này cho nhân viên để nhận nước.<br/>Không chụp ảnh màn hình.
        </p>
      </div>
      
      <button 
        onClick={() => router.back()}
        className="mt-8 text-[#FAF7F3] border border-[#FAF7F3] px-6 py-2 rounded-full font-bold opacity-80 hover:opacity-100 hover:bg-white/10 transition"
      >
        Đóng lại
      </button>
    </div>
  );
}
