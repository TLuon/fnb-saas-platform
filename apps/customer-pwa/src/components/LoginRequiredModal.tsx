'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  returnUrl?: string;
}

export const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({ 
  isOpen, 
  onClose, 
  message = 'Bạn cần đăng nhập để thực hiện chức năng này.',
  returnUrl = '/menu'
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleLoginRedirect = () => {
    // In a real app we might pass returnUrl as a query param
    router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#FFFFFF] border border-[#E8DED5] rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center">
          <h3 className="text-xl font-bold text-[#543310] mb-2">Yêu cầu đăng nhập</h3>
          <p className="text-[#6B625B] mb-6">{message}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleLoginRedirect}
              className="w-full py-2.5 bg-[#543310] text-[#FFFFFF] font-semibold rounded hover:bg-[#D67D3E] transition-colors"
            >
              Đăng nhập ngay
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#FAF7F3] text-[#222222] font-semibold rounded border border-[#E8DED5] hover:bg-gray-100 transition-colors"
            >
              Để sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
