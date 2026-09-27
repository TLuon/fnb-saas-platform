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
import { apiClient, generateVietQRUrl, VIETCOMBANK_CONFIG } from '@fnb/utils';
import { useCartStore } from '../../stores/cartStore';
import { unwrapOrderDetails } from '../../lib/checkout';
import { Copy, Check } from 'lucide-react';

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
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePayment = async () => {
    if (!orderId || isProcessing || paymentStatus === 'SUCCESS') return;

    try {
      setIsProcessing(true);
      setPaymentStatus('PENDING');

      if (paymentMethod === 'WALLET') {
        const idempotencyKey = crypto.randomUUID();
        await apiClient.post(
          `/orders/${orderId}/pay`, 
          {
            payment_method: paymentMethod,
            voucher_id: selectedVoucher?.id,
          },
          { headers: { 'Idempotency-Key': idempotencyKey } }
        );
      }

      // Clear cart after customer submits transfer info
      clearCart();
      sessionStorage.removeItem('selected_voucher_id');
      
      // DO NOT automatically submit to kitchen here for VIETQR!
      // Cashier must inspect bank app & confirm in POS first to prevent fraud.
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

  const orderCode = orderData?.order_code || orderData?.order_number || (orderId ? 'ORD-' + orderId.slice(0, 6).toUpperCase() : '');
  const transferMemo = `DH ${orderCode}`;
  const vietQrUrl = generateVietQRUrl(payableAmount, transferMemo);

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

        {/* Thanh toán VietQR Thực tế (Vietcombank) */}
        {paymentMethod === 'VIETQR' && paymentStatus !== 'SUCCESS' && (
          <div className="bg-white p-6 rounded-2xl border border-[#FED8B1] shadow-sm max-w-md mx-auto text-center space-y-4">
            <h3 className="font-bold text-[#543310] text-lg">Quét mã VietQR để thanh toán</h3>
            <p className="text-xs text-[#6B625B]">Số tiền & Nội dung chuyển khoản đã được tạo tự động</p>
            
            <div className="bg-[#FAF7F3] p-4 rounded-xl border border-[#E8DED5] flex justify-center">
              <img 
                src={vietQrUrl} 
                alt="Vietcombank VietQR Payment Code" 
                className="w-[240px] h-[240px] object-contain rounded-lg"
              />
            </div>

            <div className="bg-[#FDFBF7] border border-[#FED8B1] rounded-xl p-4 text-left space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[#6B625B]">Ngân hàng:</span>
                <span className="font-semibold text-[#543310]">{VIETCOMBANK_CONFIG.bankName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B625B]">Số tài khoản:</span>
                <div className="flex items-center gap-1.5 font-bold text-[#543310] font-mono">
                  <span>{VIETCOMBANK_CONFIG.accountNo}</span>
                  <button 
                    onClick={() => handleCopy(VIETCOMBANK_CONFIG.accountNo, 'acc')}
                    className="p-1 text-gray-400 hover:text-[#D67D3E] transition"
                    title="Sao chép số tài khoản"
                  >
                    {copiedField === 'acc' ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B625B]">Chủ tài khoản:</span>
                <span className="font-bold text-[#543310]">{VIETCOMBANK_CONFIG.accountName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B625B]">Nội dung CK:</span>
                <div className="flex items-center gap-1.5 font-bold text-[#D67D3E] font-mono">
                  <span>{transferMemo}</span>
                  <button 
                    onClick={() => handleCopy(transferMemo, 'memo')}
                    className="p-1 text-gray-400 hover:text-[#D67D3E] transition"
                    title="Sao chép nội dung chuyển khoản"
                  >
                    {copiedField === 'memo' ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div className="pt-2 border-t border-[#FED8B1] flex justify-between items-center font-bold">
                <span className="text-[#543310]">Tổng thanh toán:</span>
                <span className="text-[#D67D3E] text-lg">{formatPrice(payableAmount)}</span>
              </div>
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
            className="w-full py-4 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#D67D3E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-8 text-lg shadow-md"
          >
            {isProcessing ? 'Đang gửi thông tin...' : `Tôi đã chuyển khoản (${formatPrice(payableAmount)})`}
          </button>
        )}

        {paymentStatus === 'SUCCESS' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4 shadow-sm animate-fade-in">
            <div className="w-14 h-14 bg-emerald-100 text-[#237A57] rounded-full flex items-center justify-center mx-auto">
              <Check size={32} />
            </div>
            <div>
              <h3 className="font-bold text-xl text-[#543310]">Đã gửi thông tin thanh toán!</h3>
              <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto leading-relaxed">
                Nhà hàng đã nhận được yêu cầu của bạn. Nhân viên quầy thu ngân sẽ đối soát giao dịch chuyển khoản (Nội dung: <strong className="text-[#D67D3E] font-mono">{transferMemo}</strong>) và chuyển đơn xuống Bếp chế biến.
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full py-4 bg-[#237A57] text-white font-bold rounded-xl hover:bg-[#1c6346] transition-colors text-lg flex items-center justify-center gap-2 shadow-md mt-4"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Quay về Trang chủ
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

