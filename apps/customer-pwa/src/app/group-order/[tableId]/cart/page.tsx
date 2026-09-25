'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@fnb/utils';
import { PublicHeader } from '../../../../components/PublicHeader';
import { SharedCartPanel, SharedCartItem } from '../../../../components/group-order/SharedCartPanel';
import { GroupOrderConfirmBar } from '../../../../components/group-order/GroupOrderConfirmBar';
import { RealtimeConnectionBadge, SocketStatus } from '../../../../components/group-order/RealtimeConnectionBadge';
import { useToast } from '../../../../components/ToastProvider';
import { ArrowLeft } from 'lucide-react';

export default function GroupOrderCartPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params?.tableId as string;
  const { showInfo, showError } = useToast();

  const [cartItems, setCartItems] = useState<SharedCartItem[]>([]);
  const [sessionStatus, setSessionStatus] = useState<'ACTIVE' | 'LOCKED' | 'EXPIRED'>('ACTIVE');
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('RECONNECTING');
  const [isConfirming, setIsConfirming] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const fetchCart = async () => {
    try {
      const res: any = await apiClient.get(`/group-order/${tableId}/cart`);
      setCartItems(res.items || []);
      if (res.status) setSessionStatus(res.status);
    } catch (err) {
      console.error('Lỗi tải giỏ hàng', err);
    }
  };

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket = io(wsUrl, {
      query: { channel: `group_order:demo:${tableId}` }
    });

    socket.on('connect', () => {
      setSocketStatus('CONNECTED');
      fetchCart(); 
    });

    socket.on('disconnect', () => {
      setSocketStatus('OFFLINE');
    });

    socket.on('group_order_cart_updated', (data: any) => {
      setCartItems(data.items || []);
      if (data.status) {
        if (data.status === 'LOCKED' && sessionStatus !== 'LOCKED') {
          showInfo('Phiên đã được chốt đơn bởi một thành viên khác.');
        }
        setSessionStatus(data.status);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [tableId, sessionStatus]);

  const handleConfirm = async () => {
    if (sessionStatus !== 'ACTIVE' || isConfirming) return;
    try {
      setIsConfirming(true);
      // POST /api/v1/group-order/:tableId/confirm
      const res: any = await apiClient.post(`/group-order/${tableId}/confirm`, {});
      const data = res?.data || res;
      if (data?.order_id) {
        router.push(`/checkout?order_id=${data.order_id}`);
      } else {
        router.push('/orders');
      }
    } catch (err: any) {
      showError('Không thể xác nhận: ' + err.message);
    } finally {
      setIsConfirming(false);
    }
  };

  const totalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const isDisabled = sessionStatus !== 'ACTIVE' || cartItems.length === 0 || isConfirming;

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col pb-32">
      <div className="bg-[#FFFFFF] border-b border-[#E8DED5] p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="p-2 -ml-2 text-[#543310] hover:bg-[#FAF7F3] rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold font-serif text-[#543310]">Bàn {tableId}</h1>
        </div>
        <RealtimeConnectionBadge status={socketStatus} />
      </div>

      <div className="max-w-screen-xl mx-auto w-full p-4 space-y-4">
        {sessionStatus === 'LOCKED' && (
          <div className="bg-[#FED8B1]/30 border border-[#D67D3E] p-4 rounded-xl text-center shadow-sm">
            <p className="font-bold text-[#543310] mb-1">Phiên đã chốt đơn</p>
            <p className="text-sm text-[#6B625B]">Giỏ hàng này đã được xác nhận và đang chờ phục vụ.</p>
          </div>
        )}

        <SharedCartPanel items={cartItems} />
      </div>

      <GroupOrderConfirmBar 
        totalAmount={totalAmount} 
        itemCount={totalQuantity} 
        onConfirm={handleConfirm} 
        isDisabled={isDisabled} 
      />
    </main>
  );
}
