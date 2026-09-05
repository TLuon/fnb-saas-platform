'use client';
import React from 'react';
import { useToast } from '../../components/ToastProvider';

export default function VouchersPage() {
  const { showInfo } = useToast();

  const handleUse = () => {
    showInfo('Đã áp dụng mã giảm giá (Mock)');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F3] p-4">
      <h1 className="text-2xl font-bold text-[#543310] mb-6 border-b-2 border-[#D67D3E] inline-block pb-1">Kho Voucher</h1>
      
      <div className="space-y-4">
        {/* Voucher đền bù (CSAT_APOLOGY) */}
        <div className="bg-white rounded-xl shadow-sm border-l-8 border-l-[#D67D3E] flex overflow-hidden border border-r-gray-200 border-y-gray-200">
          <div className="p-5 flex-1">
            <div className="inline-block bg-[#FED8B1] text-[#D67D3E] text-xs font-bold px-2 py-1 rounded mb-2">CSKH Xin lỗi</div>
            <h3 className="font-bold text-[#543310] text-lg">Giảm 20% Tổng Hóa Đơn</h3>
            <p className="text-sm text-gray-500 mt-1">HSD: Không thời hạn</p>
          </div>
          <button 
            onClick={handleUse}
            className="bg-[#FAF7F3] text-[#543310] px-6 font-bold border-l border-dashed border-gray-300 hover:bg-[#FED8B1] transition"
          >
            Dùng ngay
          </button>
        </div>

        {/* Voucher thông thường */}
        <div className="bg-white rounded-xl shadow-sm flex overflow-hidden border border-gray-200">
          <div className="p-5 flex-1">
            <h3 className="font-bold text-[#543310] text-lg">Tặng 1 Bạc Xỉu</h3>
            <p className="text-sm text-gray-500 mt-1">Chương trình Thành viên mới. HSD: 30/12/2026</p>
          </div>
          <button 
            onClick={handleUse}
            className="bg-[#FAF7F3] text-[#543310] px-6 font-bold border-l border-dashed border-gray-300 hover:bg-[#FED8B1] transition"
          >
            Dùng ngay
          </button>
        </div>
      </div>
    </div>
  );
}
