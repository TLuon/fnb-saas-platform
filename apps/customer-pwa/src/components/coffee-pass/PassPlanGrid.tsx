import React from 'react';
import { PassPlan, PassPlanCard } from './PassPlanCard';

interface PassPlanGridProps {
  plans: PassPlan[];
  onSubscribe: (plan: PassPlan) => void;
}

export function PassPlanGrid({ plans, onSubscribe }: PassPlanGridProps) {
  const safePlans = Array.isArray(plans) ? plans : [];

  if (safePlans.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl border border-[#E8DED5] text-center shadow-sm">
        <p className="text-[#6B625B] font-bold">Hiện chưa có gói Coffee Pass nào.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {safePlans.map(plan => (
        <PassPlanCard key={plan.id} plan={plan} onSubscribe={onSubscribe} />
      ))}
    </div>
  );
}
