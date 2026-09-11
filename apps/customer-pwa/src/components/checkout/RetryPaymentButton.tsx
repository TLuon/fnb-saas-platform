import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RetryPaymentButtonProps {
  onRetry: () => void;
  isLoading?: boolean;
}

export function RetryPaymentButton({ onRetry, isLoading }: RetryPaymentButtonProps) {
  return (
    <button 
      onClick={onRetry}
      disabled={isLoading}
      className="w-full py-3 bg-[#543310] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#D67D3E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
    >
      <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
      Thử lại
    </button>
  );
}
