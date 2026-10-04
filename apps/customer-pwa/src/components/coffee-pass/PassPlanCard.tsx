import React from 'react';
import { Coffee } from 'lucide-react';

export interface PassPlan {
  id: string;
  name: string;
  price: number;
  total_redemptions: number;
  duration_days: number;
  description?: string;
}

interface PassPlanCardProps {
  plan: PassPlan;
  onSubscribe: (plan: PassPlan) => void;
}

export function PassPlanCard({ plan, onSubscribe }: PassPlanCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E8DED5] rounded-2xl p-5 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-[#FAF7F3] rounded-lg">
          <Coffee size={24} className="text-[#D67D3E]" />
        </div>
        <div>
          <h3 className="font-bold text-[#222222]">{plan.name}</h3>
          <p className="text-xs text-[#6B625B]">{plan.duration_days} ngày sử dụng</p>
        </div>
      </div>
      
      <p className="text-sm text-[#6B625B] flex-1">
        {plan.description || `${plan.total_redemptions} lượt đồ uống, sử dụng trong ${plan.duration_days} ngày.`}
      </p>
      
      <div className="mt-4 pt-4 border-t border-[#E8DED5]">
        <div className="flex justify-between items-center mb-4">
          <div className="text-[#222222] text-sm">
            Số lượt: <span className="font-bold">{plan.total_redemptions} ly</span>
          </div>
          <div className="text-xl font-bold font-serif text-[#543310]">
            {formatPrice(plan.price)}
          </div>
        </div>
        
        <button
          onClick={() => onSubscribe(plan)}
          className="w-full py-3 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#D67D3E] transition-colors"
        >
          Mua gói
        </button>
      </div>
    </div>
  );
}
