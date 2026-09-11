'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PublicHeader } from '../../components/PublicHeader';
import { OrderReviewList } from '../../components/checkout/OrderReviewList';
import { OrderTypeSelector } from '../../components/checkout/OrderTypeSelector';
import { PaymentMethodSelector, PaymentMethod } from '../../components/checkout/PaymentMethodSelector';
import { VoucherSelector } from '../../components/checkout/VoucherSelector';
import { WalletBalanceRow } from '../../components/checkout/WalletBalanceRow';
import { CoffeePassSelector } from '../../components/checkout/CoffeePassSelector';
import { PaymentStatusBanner, PaymentStatus } from '../../components/checkout/PaymentStatusBanner';
import { RetryPaymentButton } from '../../components/checkout/RetryPaymentButton';
import { apiClient } from '@fnb/utils';
import { useCartStore } from '../../stores/cartStore';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams?.get('order_id');
  const clearCart = useCartStore(state => state.clearCart);

  const [orderData, setOrderData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [orderType, setOrderType] = useState<'DINE_IN' | 'PICKUP'>('DINE_IN');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VIETQR');
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('IDLE');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError(true);
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(false);
        // GET /api/v1/orders/:id
        const res: any = await apiClient.get(`/orders/${orderId}`);
        setOrderData(res);
      } catch (err) {
        console.error('Failed to fetch order', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handlePayment = async () => {
    if (!orderId || isProcessing || paymentStatus === 'SUCCESS') return;

    try {
      setIsProcessing(true);
      setPaymentStatus('PENDING');

      // Generate Idempotency Key
      const idempotencyKey = crypto.randomUUID();

      // POST /api/v1/orders/:id/pay
      const res = await apiClient.post(
        `/orders/${orderId}/pay`, 
        { payment_method: paymentMethod },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      // Theo task: Chỉ clear cart SAU KHI backend trả success
      clearCart();
      setPaymentStatus('SUCCESS');

    } catch (err) {
      console.error('Payment failed', err);
      setPaymentStatus('FAIL');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Nếu API bị lỗi, ta chỉ hiển thị lỗi vì yêu cầu không dùng mock dữ liệu.
  if (error) {
    return (
      <main className="min-h-screen bg-[#FAF7F3] flex flex-col">
        <PublicHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-[#FEE4E2] text-[#B42318] rounded-full flex items-center justify-center mx-auto mb-4 font-bold">!</div>
          <h2 className="text-xl font-bold text-[#543310] mb-2">Lỗi tải thông tin đơn hàng</h2>
          <p className="text-[#6B625B]">Không tìm thấy order_id hoặc API bị lỗi.</p>
          <button onClick={() => router.push('/cart')} className="mt-6 px-6 py-2 bg-[#543310] text-white rounded-xl">Quay lại Giỏ hàng</button>
        </div>
      </main>
    );
  }

  if (loading || !orderData) {
    return (
      <main className="min-h-screen bg-[#FAF7F3] flex flex-col">
        <PublicHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#543310]"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col pb-32">
      <PublicHeader />
      
      <div className="max-w-screen-xl mx-auto w-full p-4 space-y-6">
        <h1 className="text-2xl font-bold font-serif text-[#543310]">Thanh toán</h1>

        <PaymentStatusBanner status={paymentStatus} />

        <OrderTypeSelector 
          type={orderType} 
          onChange={setOrderType} 
          tableName={orderData.table_name || 'T1-01'} 
        />

        <OrderReviewList items={orderData.items || []} />

        <VoucherSelector onSelect={() => {}} />

        <PaymentMethodSelector method={paymentMethod} onChange={setPaymentMethod} />

        {paymentMethod === 'WALLET' && (
          <WalletBalanceRow balance={orderData.customer_wallet_balance || 0} />
        )}

        {paymentMethod === 'COFFEE_PASS' && (
          <CoffeePassSelector hasPass={true} passName="Gói Cà phê Sáng (Còn 5 ly)" onSelect={() => {}} />
        )}

        {/* Thanh toán VietQR có thể hiện Inline panel nếu cần, hoặc xử lý sau khi bấm nút Thanh Toán */}
        {paymentMethod === 'VIETQR' && paymentStatus === 'PENDING' && (
          <div className="bg-white p-4 rounded-xl border border-[#FED8B1] shadow-sm text-center">
             <p className="text-[#D67D3E] font-bold mb-2">Quét mã QR bằng ứng dụng ngân hàng</p>
             <div className="w-48 h-48 bg-gray-100 mx-auto border-2 border-dashed border-[#E8DED5] flex items-center justify-center">
               <span className="text-[#6B625B]">QR Code</span>
             </div>
          </div>
        )}

        {paymentStatus === 'FAIL' && (
          <RetryPaymentButton onRetry={handlePayment} isLoading={isProcessing} />
        )}

        {paymentStatus !== 'SUCCESS' && paymentStatus !== 'FAIL' && (
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full py-4 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#D67D3E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-8 text-lg"
          >
            Thanh toán {formatPrice(orderData.total_amount || 0)}
          </button>
        )}
      </div>
    </main>
  );
}
