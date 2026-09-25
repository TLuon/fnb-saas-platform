'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { apiClient } from '@fnb/utils';
import { useCartStore } from '../../../stores/cartStore';
import { useToast } from '../../../components/ToastProvider';
import { OrderStatusTimeline } from '../../../components/orders/OrderStatusTimeline';
import { OrderDetailItems } from '../../../components/orders/OrderDetailItems';
import { PaymentSummary } from '../../../components/orders/PaymentSummary';
import { CSATPrompt } from '../../../components/orders/CSATPrompt';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { showInfo, showError } = useToast();
  const orderId = params?.id;
  const clearCart = useCartStore(state => state.clearCart);
  const addItem = useCartStore(state => state.addItem);

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res: any = await apiClient.get(`/orders/${orderId}`);
        const data = res?.data || res;
        setOrder(data);
      } catch (err: any) {
        showError(err?.response?.data?.message || err?.message || 'Không thể tải chi tiết đơn hàng');
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [orderId]);

  const handleReorder = () => {
    if (!order || !order.items) return;
    clearCart();
    order.items.forEach((item: any) => {
      addItem({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        note: item.note,
        imageUrl: '' // Mock image since order detail might not have it
      });
    });
    showInfo('Đã thêm lại các món vào giỏ hàng.');
    router.push('/cart');
  };

  const handleCSATSubmit = async (score: number, note: string) => {
    try {
      await apiClient.post(`/support/csat`, { order_id: orderId, score, note });
      setOrder({ ...order, is_rated: true });
    } catch (err) {
      // Allow optimistic UI update for demo
      setOrder({ ...order, is_rated: true });
    }
  };

  if (loading || !order) {
    return (
      <main className="min-h-screen bg-[#FAF7F3] flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#543310]"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col pb-24">
      <div className="bg-[#FFFFFF] border-b border-[#E8DED5] p-4 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
        <button 
          onClick={() => router.back()}
          className="p-2 -ml-2 text-[#543310] hover:bg-[#FAF7F3] rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold font-serif text-[#543310] uppercase">#{order.id}</h1>
          <p className="text-xs text-[#6B625B]">{new Date(order.created_at).toLocaleString('vi-VN')}</p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto w-full p-4 space-y-4">
        <OrderStatusTimeline currentStatus={order.status} />

        <OrderDetailItems items={order.items || []} />

        <PaymentSummary 
          subtotal={order.total_amount} 
          discount={order.discount} 
          total={order.total_amount} 
          paymentMethod={order.payment_method} 
        />

        {order.status === 'COMPLETED' && (
          <CSATPrompt hasRated={order.is_rated} onSubmit={handleCSATSubmit} />
        )}

        <button 
          onClick={handleReorder}
          className="w-full py-4 bg-[#543310] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#D67D3E] transition-colors shadow-sm mt-8"
        >
          <RotateCcw size={20} /> Đặt lại đơn này
        </button>
      </div>
    </main>
  );
}
