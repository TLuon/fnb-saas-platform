import React, { useState, useEffect } from 'react';
import { X, Users, Calendar, Clock, DollarSign, UserCheck, ShieldCheck } from 'lucide-react';
import { useAuthGuard } from '../hooks/useAuthGuard';

export interface BookingDetails {
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  guest_count: number;
}

interface TableInfoDrawerProps {
  table: any;
  isOpen: boolean;
  onClose: () => void;
  onSelectTable: (table: any, details: BookingDetails) => void;
}

export function TableInfoDrawer({ table, isOpen, onClose, onSelectTable }: TableInfoDrawerProps) {
  const { requireAuth } = useAuthGuard();

  const [bookingType, setBookingType] = useState<'SINGLE' | 'GROUP'>('SINGLE');
  const [durationHours, setDurationHours] = useState(2);
  const [guestCount, setGuestCount] = useState(2);

  useEffect(() => {
    if (table) {
      // Default guest count based on table capacity or 2
      const cap = table.capacity || 2;
      if (cap >= 5) {
        setBookingType('GROUP');
        setGuestCount(Math.max(5, cap));
      } else {
        setBookingType('SINGLE');
        setGuestCount(Math.min(4, cap > 0 ? cap : 2));
      }
    }
  }, [table]);

  if (!isOpen || !table) return null;

  const isAvailable = table.status === 'AVAILABLE';

  // Calculate deposit based on guest count tier
  const getDepositAmount = (count: number) => {
    if (count < 5) return 50000;
    if (count <= 7) return 100000;
    return 200000;
  };

  const depositAmount = getDepositAmount(guestCount);

  const handleSelectType = (type: 'SINGLE' | 'GROUP') => {
    setBookingType(type);
    if (type === 'SINGLE') {
      setGuestCount(2);
    } else {
      setGuestCount(8);
    }
  };

  const handleConfirmReservation = () => {
    requireAuth(() => {
      onSelectTable(table, {
        booking_date: '',
        booking_time: '',
        duration_hours: Number(durationHours),
        guest_count: Number(guestCount),
      });
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 transition-opacity animate-fade-in">
      <div 
        className="bg-[#FFFFFF] w-full sm:w-[460px] rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E8DED5] bg-[#FAF7F3]">
          <div>
            <h3 className="font-bold text-lg text-[#543310]">Tùy Chọn Đặt Bàn</h3>
            <p className="text-xs text-[#6B625B]">Bàn: <strong className="text-[#D67D3E] font-bold">{table.name || table.code || 'Bàn'}</strong> (Sức chứa: {table.capacity || 4} chỗ)</p>
          </div>
          <button onClick={onClose} className="p-2 text-[#6B625B] hover:bg-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-[#222222]">
          {/* Step 1: Booking Type Selection */}
          <div>
            <label className="block text-xs font-bold text-[#543310] uppercase tracking-wider mb-2">
              1. Chọn hình thức đặt bàn
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectType('SINGLE')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  bookingType === 'SINGLE'
                    ? 'border-[#543310] bg-[#543310] text-white shadow-md'
                    : 'border-[#E8DED5] bg-white text-[#543310] hover:border-[#D67D3E]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <span>☕</span>
                  <span>Đặt bàn đơn</span>
                </div>
                <span className={`text-[11px] ${bookingType === 'SINGLE' ? 'text-white/80' : 'text-[#6B625B]'}`}>
                  Dưới 5 người • Cọc 50k
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectType('GROUP')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                  bookingType === 'GROUP'
                    ? 'border-[#543310] bg-[#543310] text-white shadow-md'
                    : 'border-[#E8DED5] bg-white text-[#543310] hover:border-[#D67D3E]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <span>🔥</span>
                  <span>Đặt bàn theo đoàn</span>
                </div>
                <span className={`text-[11px] ${bookingType === 'GROUP' ? 'text-white/80' : 'text-[#6B625B]'}`}>
                  Từ 5 người trở lên
                </span>
              </button>
            </div>
          </div>

          {/* Step 2: Guest count selector */}
          <div className="bg-[#FAF7F3] border border-[#E8DED5] p-3.5 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#543310] uppercase flex items-center gap-1.5">
                <Users size={14} className="text-[#D67D3E]" />
                Số lượng khách đi cùng
              </label>
              <span className="text-xs font-bold text-[#D67D3E]">
                {guestCount >= 8 ? 'Đoàn đông người (>=8 khách)' : guestCount >= 5 ? 'Nhóm vừa (5-7 khách)' : 'Khách lẻ/Cặp đôi'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                className="w-10 h-10 rounded-xl bg-white border border-[#E8DED5] font-extrabold text-[#543310] hover:bg-gray-100 flex items-center justify-center text-lg shadow-sm"
              >
                -
              </button>
              <div className="flex-1 text-center bg-white border border-[#E8DED5] py-2 rounded-xl font-bold text-base text-[#543310]">
                {guestCount} người
              </div>
              <button
                type="button"
                onClick={() => setGuestCount(guestCount + 1)}
                className="w-10 h-10 rounded-xl bg-white border border-[#E8DED5] font-extrabold text-[#543310] hover:bg-gray-100 flex items-center justify-center text-lg shadow-sm"
              >
                +
              </button>
            </div>
          </div>

          {/* Step 3: Timing parameters */}
          <div>
            <label className="block text-[11px] font-bold text-[#543310] uppercase mb-1 flex items-center gap-1">
              <Clock size={12} className="text-[#D67D3E]" /> Thời gian giữ bàn (Tối đa 2 giờ)
            </label>
            <select
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="w-full border border-[#E8DED5] rounded-xl px-3 py-2.5 font-bold text-sm text-[#543310] focus:border-[#D67D3E] focus:outline-none bg-white mb-2"
            >
              <option value={1}>1 giờ</option>
              <option value={1.5}>1 giờ 30 phút</option>
              <option value={2}>2 giờ</option>
            </select>
            
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-800 flex flex-col gap-1">
              <p><strong>Lưu ý:</strong> Tính năng đặt bàn trực tuyến chỉ áp dụng cho <strong>khách đến liền (giữ tối đa 2 giờ)</strong>.</p>
              <p>Đối với nhu cầu đặt bàn trước theo ngày/giờ hoặc giữ bàn trên 2 tiếng, vui lòng liên hệ nhân viên qua số <strong>Hotline: 1900 1234</strong> để được hỗ trợ.</p>
            </div>
          </div>

          {/* Deposit summary banner */}
          <div className="bg-[#FAF7F3] border border-[#E8DED5] p-3.5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#D67D3E]/10 flex items-center justify-center text-[#D67D3E]">
                <DollarSign size={20} />
              </div>
              <div>
                <span className="text-xs text-[#6B625B] block font-medium">Tiền đặt cọc giữ chỗ:</span>
                <span className="text-lg font-extrabold text-[#D67D3E]">
                  {depositAmount.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </div>
            <ShieldCheck className="text-green-600 w-6 h-6" />
          </div>

          {/* Action button */}
          <button
            onClick={handleConfirmReservation}
            disabled={!isAvailable}
            className={`w-full py-3.5 rounded-2xl font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
              isAvailable 
                ? 'bg-[#543310] text-white hover:bg-[#D67D3E] active:scale-[0.99]' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <UserCheck size={18} />
            <span>{isAvailable ? `Tiến Hành Đặt Bàn & Chuyển Cọc (${depositAmount.toLocaleString('vi-VN')}đ)` : 'Bàn Hiện Đã Có Khách'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
