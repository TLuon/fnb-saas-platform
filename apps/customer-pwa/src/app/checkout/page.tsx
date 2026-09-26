'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PublicHeader } from '../../components/PublicHeader';
import { OrderReviewList } from '../../components/checkout/OrderReviewList';
import { OrderTypeSelector } from '../../components/checkout/OrderTypeSelector';
import { PaymentMethodSelector, PaymentMethod } from '../../components/checkout/PaymentMethodSelector';
import { VoucherSelector, VoucherOption } from '../../components/checkout/VoucherSelector';
import { WalletBalanceRow } from '../../components/checkout/WalletBalanceRow';
import { CoffeePassSelector } from '../../components/checkout/CoffeePassSelector';
import { PaymentStatusBanner, PaymentStatus } from '../../components/checkout/PaymentStatusBanner';
import { RetryPaymentButton } from '../../components/checkout/RetryPaymentButton';
import { apiClient } from '@fnb/utils';
import { useCartStore } from '../../stores/cartStore';
import { unwrapOrderDetails } from '../../lib/checkout';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams?.get('order_id');
  const clearCart = useCartStore(state => state.clearCart);

  const [orderData, setOrderData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('TAKEAWAY');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VIETQR');
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherOption | null>(null);
  
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
        const ord = unwrapOrderDetails(res);
        setOrderData(ord);
        setOrderType(ord?.order_type === 'DINE_IN' ? 'DINE_IN' : 'TAKEAWAY');
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
        {
          payment_method: paymentMethod,
          voucher_id: selectedVoucher?.id,
        },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );

      // Theo task: Chỉ clear cart SAU KHI backend trả success
      clearCart();
      sessionStorage.removeItem('selected_voucher_id');
      
      // Gửi bếp sau khi thanh toán thành công (Bất kể tại bàn hay mang đi)
      try {
        await apiClient.post(`/orders/${orderId}/submit-kitchen`);
      } catch (err) {
        console.error('Failed to submit to kitchen after payment', err);
      }
      
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

  const subtotal = Number(orderData?.subtotal ?? orderData?.final_amount ?? 0);
  const discountAmount = selectedVoucher?.discount_percent
    ? Math.round(subtotal * selectedVoucher.discount_percent / 100)
    : Number(orderData?.discount_amount ?? 0);
  const payableAmount = Math.max(0, subtotal - discountAmount);

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
          tableName={orderData.table_name || orderData.tables?.table_code || ''}
        />

        <OrderReviewList
          items={(orderData.order_items || orderData.items || []).map((it: any) => ({
            id: it.id,
            name: it.product_name || it.name || 'Món ăn',
            quantity: it.quantity,
            price: Number(it.unit_price || it.price || 0),
            modifiers: it.modifiers ? (typeof it.modifiers === 'string' ? it.modifiers : Object.values(it.modifiers).join(', ')) : undefined,
          }))}
        />

        <VoucherSelector selectedVoucher={selectedVoucher} onSelect={setSelectedVoucher} />

        {discountAmount > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
            <span>Giảm giá voucher</span>
            <span>-{formatPrice(discountAmount)}</span>
          </div>
        )}

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
            Thanh toán {formatPrice(payableAmount)}
          </button>
        )}

        {paymentStatus === 'SUCCESS' && (
          <button
            onClick={() => router.push('/')}
            className="w-full py-4 bg-[#237A57] text-white font-bold rounded-xl hover:bg-[#1c6346] transition-colors mt-8 text-lg flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Về trang chủ
          </button>
        )}
      </div>
    </main>
  );
}
