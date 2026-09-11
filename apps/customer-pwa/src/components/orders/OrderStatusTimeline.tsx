import React from 'react';
import { Check } from 'lucide-react';

interface OrderStatusTimelineProps {
  currentStatus: string;
}

export function OrderStatusTimeline({ currentStatus }: OrderStatusTimelineProps) {
  const steps = [
    { id: 'PENDING', label: 'Chờ xử lý' },
    { id: 'PREPARING', label: 'Đang chuẩn bị' },
    { id: 'READY', label: 'Sẵn sàng' },
    { id: 'SERVED', label: 'Đã phục vụ' },
    { id: 'COMPLETED', label: 'Hoàn thành' }
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStatus);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0; // Default to PENDING if unknown
  
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-[#E8DED5] text-center">
        <p className="font-bold text-[#B42318]">Đơn hàng này đã bị hủy.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] p-6 rounded-xl shadow-sm border border-[#E8DED5]">
      <h3 className="font-bold text-[#543310] mb-6 text-sm">Trạng thái đơn hàng</h3>
      <div className="relative border-l-2 border-[#E8DED5] ml-3 space-y-6">
        {steps.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div key={step.id} className="relative flex items-center pl-6">
              <div 
                className={`absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                  isCompleted ? 'bg-[#237A57] text-white' : isCurrent ? 'bg-[#D67D3E] shadow-[0_0_0_4px_rgba(214,125,62,0.2)]' : 'bg-[#E8DED5]'
                }`}
              >
                {isCompleted && <Check size={10} strokeWidth={4} />}
              </div>
              <span className={`text-sm font-bold transition-colors ${
                isCompleted ? 'text-[#237A57]' : isCurrent ? 'text-[#D67D3E]' : 'text-[#6B625B]'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
