'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../components/ToastProvider';
import { Ticket, Gift, Sparkles } from 'lucide-react';

interface VoucherItem {
  id: string;
  voucher_code?: string;
  discount_percent?: number;
  free_item_product_id?: string;
  expires_at?: string;
  is_used?: boolean;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { showInfo, showError } = useToast();

  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      let token = '';
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
        token = match ? decodeURIComponent(match[1]) : (localStorage.getItem('access_token') || '');
      }

      if (!token) {
        setVouchers([]);
        return;
      }

      const res = await fetch(`${baseUrl}/wallet/vouchers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const resJson = await res.json();
        const payload = resJson?.data ?? resJson;
        const list: VoucherItem[] = Array.isArray(payload?.vouchers)
          ? payload.vouchers
          : Array.isArray(payload)
            ? payload
            : [];
        setVouchers(list);
      } else {
        setVouchers([]);
      }
    } catch (err: any) {
      console.error('Lỗi khi nạp voucher:', err);
      showError('Không thể nạp danh sách voucher');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleUse = (v: VoucherItem) => {
    showInfo(`Đã chọn áp dụng mã ${v.voucher_code || 'ưu đãi'} cho đơn hàng`);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F3] p-4 pb-20">
      <h1 className="text-2xl font-bold text-[#543310] mb-6 border-b-2 border-[#D67D3E] inline-block pb-1">
        Kho Voucher của tôi
      </h1>
      
      {loading ? (
        <div className="text-center py-12 text-gray-400">Đang tải voucher từ ví...</div>
      ) : vouchers.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-400 my-8">
          <Ticket size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">Bạn chưa có voucher nào khả dụng.</p>
          <p className="text-xs text-gray-400 mt-1">
            Voucher được tặng tự động khi nạp tiền, hoàn tất đơn hoặc từ chương trình chăm sóc khách hàng.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {vouchers.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-2xl shadow-sm border-l-8 border-l-[#D67D3E] flex overflow-hidden border border-r-gray-200 border-y-gray-200"
            >
              <div className="p-5 flex-1">
                <div className="inline-flex items-center gap-1 bg-[#FED8B1] text-[#D67D3E] text-xs font-bold px-2.5 py-1 rounded-full mb-2">
                  <Sparkles size={12} />
                  <span>Ưu đãi thành viên</span>
                </div>
                <h3 className="font-bold text-[#543310] text-lg">
                  {v.discount_percent
                    ? `Giảm ${v.discount_percent}% Tổng Hóa Đơn`
                    : v.free_item_product_id
                      ? 'Tặng 1 Món Đồ Uống Miễn Phí'
                      : 'Voucher Khuyến Mãi'}
                </h3>
                {v.voucher_code && (
                  <p className="text-xs font-mono font-bold text-gray-500 mt-1">
                    Mã: {v.voucher_code}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  HSD: {v.expires_at ? new Date(v.expires_at).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                </p>
              </div>
              <button
                onClick={() => handleUse(v)}
                className="bg-[#FAF7F3] text-[#543310] px-6 font-bold border-l border-dashed border-gray-300 hover:bg-[#FED8B1] transition text-sm flex items-center justify-center gap-1"
              >
                <Gift size={16} />
                <span>Dùng ngay</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
