import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Đã có lỗi xảy ra',
  message = 'Vui lòng thử lại sau.',
  onRetry,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 bg-[#FFFFFF] rounded-lg border border-[#E8DED5] text-center ${className}`}>
      <AlertCircle className="w-12 h-12 text-[#B42318] mb-4" />
      <h3 className="text-lg font-semibold text-[#B42318] mb-2">{title}</h3>
      <p className="text-[#6B625B] mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-[#543310] hover:bg-[#D67D3E] text-white rounded-md font-medium transition-colors"
        >
          Thử lại
        </button>
      )}
    </div>
  );
};
