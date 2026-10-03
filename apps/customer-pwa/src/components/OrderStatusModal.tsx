'use client';

import React, { useEffect, useState } from 'react';
import { RealtimeClient, authStore } from '@fnb/utils';
import { useStore } from 'zustand';
import { X, PhoneCall, CheckCircle, Info } from 'lucide-react';

export default function OrderStatusModal() {
  const [modalData, setModalData] = useState<{ status: string; reason?: string; message?: string } | null>(null);
  const isAuthenticated = useStore(authStore, state => state.isAuthenticated);
  const accessToken = useStore(authStore, state => state.accessToken);

  useEffect(() => {
    let client: RealtimeClient;
    const initSocket = async () => {
      client = new RealtimeClient({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ioekhkpzrpuivzzannvn.supabase.co',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_36iHq3qBFqoisdD4tGTXeA_238_YgDa',
        socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
        token: accessToken || undefined,
      });

      await client.connect();

      if (client?.socket) {
        client.socket.on('order_status_changed', (data: any) => {
          const status = (data?.status || '').toUpperCase();
          if (status === 'CANCELLED') {
            setModalData({
              status: 'CANCELLED',
              reason: data.reason || 'Cửa hàng đã hủy đơn này.',
            });
          } else if (status === 'IN_PROGRESS') {
            setModalData({
              status: 'SUCCESS',
              message: data.message || 'Nhà hàng đã xác nhận thanh toán thành công, bếp đang chuẩn bị món!',
            });
          } else if (status === 'PAID') {
            setModalData({
              status: 'SUCCESS',
              message: data.message || 'Nhà hàng đã xác nhận tiền cọc! Đặt bàn của bạn đã thành công.',
            });
          }
        });
      }
    };

    initSocket();

    return () => {
      if (client) client.disconnect();
    };
  }, [accessToken]);

  if (!modalData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button
          onClick={() => setModalData(null)}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          {modalData.status === 'CANCELLED' ? (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <X size={32} className="text-red-500" />
            </div>
          ) : modalData.status === 'SUCCESS' ? (
             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Info size={32} className="text-blue-500" />
            </div>
          )}

          <h3 className="text-xl font-bold text-gray-900 font-serif mb-2">
            {modalData.status === 'CANCELLED' ? 'Đơn Hàng Bị Hủy' : modalData.status === 'SUCCESS' ? 'Xác Nhận Đơn Hàng' : 'Thông Báo Đơn Hàng'}
          </h3>
          
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            {modalData.reason || modalData.message}
          </p>

          {modalData.status === 'CANCELLED' && (
            <div className="w-full bg-[#FAF7F3] rounded-2xl p-4 mb-6 border border-[#E8DED5]">
              <p className="text-xs text-[#6B625B] mb-2 uppercase font-bold tracking-wider">Hỗ trợ trực tiếp</p>
              <div className="flex items-center justify-center gap-3">
                <div className="bg-white p-2 rounded-full shadow-sm">
                  <PhoneCall size={20} className="text-[#D67D3E]" />
                </div>
                <a href="tel:0344566957" className="text-lg font-bold text-[#543310] hover:text-[#D67D3E] transition-colors">
                  0344 566 957
                </a>
              </div>
            </div>
          )}

          <button
            onClick={() => setModalData(null)}
            className="w-full py-3.5 bg-[#543310] hover:bg-[#D67D3E] text-white font-bold rounded-xl transition-colors shadow-md"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
