import React, { useEffect, useState } from 'react';
import { Tag, ChevronRight, X } from 'lucide-react';
import { apiClient } from '@fnb/utils';

export interface VoucherOption {
  id: string;
  discount_percent?: number;
  expires_at?: string;
}

interface VoucherSelectorProps {
  selectedVoucher?: VoucherOption | null;
  onSelect: (voucher: VoucherOption | null) => void;
}

export function VoucherSelector({ selectedVoucher, onSelect }: VoucherSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [vouchers, setVouchers] = useState<VoucherOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadVouchers = async () => {
    setLoading(true);
    setError('');
    try {
      const payload: any = await apiClient.get('/wallet/vouchers');
      const list = Array.isArray(payload?.vouchers) ? payload.vouchers : [];
      setVouchers(list);
      return list as VoucherOption[];
    } catch (err: any) {
      setError(err?.message || 'Không thể tải voucher');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const preferredId = sessionStorage.getItem('selected_voucher_id');
    if (!preferredId || selectedVoucher) return;
    void loadVouchers().then((list) => {
      const preferred = list.find((voucher) => voucher.id === preferredId);
      if (preferred) onSelect(preferred);
      else sessionStorage.removeItem('selected_voucher_id');
    });
  }, []);

  const openSelector = () => {
    setIsOpen(true);
    void loadVouchers();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openSelector}
        className="w-full bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-[#E8DED5] flex items-center justify-between transition-colors hover:bg-[#FAF7F3]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FED8B1] text-[#D67D3E] rounded-full flex items-center justify-center">
            <Tag size={20} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-[#543310] text-sm">Voucher / Khuyến mãi</h3>
            <p className="text-xs text-[#6B625B]">
              {selectedVoucher?.discount_percent
                ? (selectedVoucher.discount_percent > 100 
                    ? `Đã chọn voucher giảm ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedVoucher.discount_percent)}`
                    : `Đã chọn voucher giảm ${selectedVoucher.discount_percent}%`)
                : 'Chọn voucher khả dụng'}
            </p>
          </div>
        </div>
        <ChevronRight size={20} className="text-[#6B625B]" />
      </button>

      {isOpen && (
        <div className="mt-2 rounded-lg border border-[#E8DED5] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-bold text-[#543310]">Voucher khả dụng</h4>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Đóng danh sách voucher">
              <X size={18} />
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-[#6B625B]">Đang tải voucher...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : vouchers.length === 0 ? (
            <p className="text-sm text-[#6B625B]">Bạn chưa có voucher khả dụng.</p>
          ) : (
            <div className="space-y-2">
              {vouchers.map((voucher) => (
                <button
                  type="button"
                  key={voucher.id}
                  onClick={() => {
                    onSelect(voucher);
                    sessionStorage.setItem('selected_voucher_id', voucher.id);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-md border border-[#E8DED5] px-3 py-3 text-left hover:border-[#D67D3E]"
                >
                  <span className="font-bold text-[#543310]">
                    {voucher.discount_percent > 100 
                      ? `Giảm ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(voucher.discount_percent)}`
                      : `Giảm ${voucher.discount_percent}%`}
                  </span>
                  <span className="text-xs text-[#6B625B]">
                    {voucher.expires_at ? `HSD ${new Date(voucher.expires_at).toLocaleDateString('vi-VN')}` : 'Không giới hạn'}
                  </span>
                </button>
              ))}
              {selectedVoucher && (
                <button
                  type="button"
                  onClick={() => {
                    onSelect(null);
                    sessionStorage.removeItem('selected_voucher_id');
                    setIsOpen(false);
                  }}
                  className="w-full py-2 text-sm font-bold text-red-600"
                >
                  Bỏ áp dụng voucher
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
