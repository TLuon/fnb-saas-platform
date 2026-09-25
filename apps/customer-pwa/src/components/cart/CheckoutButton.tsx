import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient, authStore } from '@fnb/utils';
import { useStore } from 'zustand';
import { buildOrderItemPayload } from '../../lib/checkout';

interface CheckoutButtonProps {
  isDisabled: boolean;
  itemCount: number;
  totalAmount: number;
  items?: any[];
  orderNote?: string;
}

export function CheckoutButton({ isDisabled, itemCount, totalAmount, items, orderNote }: CheckoutButtonProps) {
  const router = useRouter();
  const isAuthenticated = useStore(authStore, (state) => state.isAuthenticated);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleCheckout = async () => {
    if (isDisabled || isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (!isAuthenticated) {
        router.push('/login?returnUrl=/cart');
        return;
      }

      // 1. Tạo order DINE_IN hoặc TAKEAWAY
      const orderRes: any = await apiClient.post('/orders', {
        order_type: 'TAKEAWAY',
      });
      const orderData = orderRes.data?.data || orderRes.data || orderRes;
      const orderId = orderData.id || orderData.order_id;

      if (!orderId) {
        throw new Error('Không thể khởi tạo đơn hàng');
      }

      // 2. Thêm các món trong cart vào order
      if (items && items.length > 0) {
        for (const item of items) {
          await apiClient.post(
            `/orders/${orderId}/items`,
            buildOrderItemPayload(item, orderNote),
          );
        }
      }

      // 3. Gửi bếp
      await apiClient.post(`/orders/${orderId}/submit-kitchen`);

      // 4. Chuyển tới trang checkout thật
      router.push(`/checkout?order_id=${orderId}`);
    } catch (err: any) {
      console.error('Checkout creation error:', err);
      alert(err.response?.data?.message || err.message || 'Lỗi khi tạo đơn hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8DED5] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 md:sticky">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm text-[#6B625B]">{itemCount} món</span>
          <span className="font-bold text-[#543310] text-lg">{formatPrice(totalAmount)}</span>
        </div>
        
        <button
          onClick={handleCheckout}
          disabled={isDisabled || isSubmitting}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-sm transition-all ${
            isDisabled || isSubmitting
              ? 'bg-[#E8DED5] text-[#6B625B] cursor-not-allowed'
              : 'bg-[#543310] text-white hover:bg-[#D67D3E]'
          }`}
        >
          {isSubmitting ? 'Đang tạo đơn...' : 'Thanh toán'} <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
