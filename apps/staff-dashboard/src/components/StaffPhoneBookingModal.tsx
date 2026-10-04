import React, { useState } from 'react';
import { X, Calendar, Clock, Users, Phone, User, DollarSign, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@fnb/utils';

interface TableOption {
  id: string;
  name?: string;
  code?: string;
  capacity?: number;
  status: string;
}

interface StaffPhoneBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableOption[];
  selectedTableId?: string;
  onSuccess: (reservation: any) => void;
}

export const StaffPhoneBookingModal: React.FC<StaffPhoneBookingModalProps> = ({
  isOpen,
  onClose,
  tables,
  selectedTableId,
  onSuccess,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('18:00');
  const [durationHours, setDurationHours] = useState(2);
  const [guestCount, setGuestCount] = useState(4);
  const [tableId, setTableId] = useState(selectedTableId || (tables.length > 0 ? tables[0].id : ''));
  const [depositMethod, setDepositMethod] = useState<'CASH' | 'VIETQR' | 'WAIVED'>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Update tableId if prop selectedTableId changes
  React.useEffect(() => {
    if (selectedTableId) {
      setTableId(selectedTableId);
    } else if (tables.length > 0 && !tableId) {
      setTableId(tables[0].id);
    }
  }, [selectedTableId, tables]);

  if (!isOpen) return null;

  // Calculate deposit amount helper
  const getDepositAmount = (count: number) => {
    if (count < 5) return 50000;
    if (count <= 7) return 100000;
    return 200000;
  };

  const depositAmount = getDepositAmount(guestCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMessage('Vui lòng nhập tên khách hàng');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại');
      return;
    }
    if (!tableId) {
      setErrorMessage('Vui lòng chọn bàn giữ chỗ');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const payload = {
        table_id: tableId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        booking_date: bookingDate,
        booking_time: bookingTime,
        duration_hours: Number(durationHours),
        guest_count: Number(guestCount),
        created_by_role: 'STAFF',
        payment_method_deposit: depositMethod,
      };

      const res: any = await apiClient.post('/reservations/staff-create', payload);
      const data = res?.data || res;
      onSuccess({
        ...data,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        booking_date: payload.booking_date,
        booking_time: payload.booking_time,
        duration_hours: payload.duration_hours,
        guest_count: payload.guest_count,
      });
      onClose();
    } catch (err: any) {
      console.error('Staff phone booking error:', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Không thể tạo đơn đặt bàn');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#543310] text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-[#D67D3E]" />
            <h2 className="text-lg font-bold">Nhận Điện Thoại - Đặt Bàn Theo Giờ</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-[#222222]">
          {errorMessage && (
            <div className="p-3 bg-[#FEE4E2] border border-[#FDA29B] rounded-xl text-[#B42318] text-sm font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#543310] uppercase mb-1">
                Tên khách hàng *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-[#E8DED5] rounded-xl text-sm focus:border-[#D67D3E] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#543310] uppercase mb-1">
                Số điện thoại *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="tel"
                  required
                  placeholder="0912345678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-[#E8DED5] rounded-xl text-sm focus:border-[#D67D3E] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Guest Count & Table selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#543310] uppercase mb-1">
                Số lượng khách (người)
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full pl-9 pr-3 py-2 border border-[#E8DED5] rounded-xl text-sm focus:border-[#D67D3E] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#543310] uppercase mb-1">
                Chọn Bàn *
              </label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full px-3 py-2 border border-[#E8DED5] rounded-xl text-sm font-semibold text-[#543310] focus:border-[#D67D3E] focus:outline-none"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.code || `Bàn ${t.id}`} ({t.capacity || 4} chỗ) - {t.status === 'AVAILABLE' ? 'Trống' : t.status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date, Time & Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#543310] uppercase mb-1">
                Ngày đặt
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full pl-8 pr-1 py-2 border border-[#E8DED5] rounded-xl text-xs focus:border-[#D67D3E] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#543310] uppercase mb-1">
                Khung giờ
              </label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full pl-8 pr-1 py-2 border border-[#E8DED5] rounded-xl text-xs focus:border-[#D67D3E] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#543310] uppercase mb-1">
                Thời lượng
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full px-2 py-2 border border-[#E8DED5] rounded-xl text-xs focus:border-[#D67D3E] focus:outline-none"
              >
                <option value={1}>1 giờ</option>
                <option value={1.5}>1.5 giờ</option>
                <option value={2}>2 giờ</option>
                <option value={3}>3 giờ</option>
                <option value={4}>4 giờ</option>
              </select>
            </div>
          </div>

          {/* Deposit Info Banner */}
          <div className="bg-[#FAF7F3] border border-[#E8DED5] p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-[#6B625B]">Mức tiền cọc quy định:</span>
              <div className="text-lg font-extrabold text-[#D67D3E]">
                {depositAmount.toLocaleString('vi-VN')} VNĐ
              </div>
              <span className="text-[11px] text-[#6B625B]">
                {guestCount >= 8 ? '🔥 Khách đoàn (>= 8 người)' : guestCount >= 5 ? '👥 Khách nhóm (5-7 người)' : '☕ Khách lẻ (< 5 người)'}
              </span>
            </div>
            <DollarSign className="w-8 h-8 text-[#D67D3E] opacity-50" />
          </div>

          {/* Deposit Payment Method */}
          <div>
            <label className="block text-xs font-bold text-[#543310] uppercase mb-2">
              Hình thức xử lý tiền cọc
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDepositMethod('CASH')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  depositMethod === 'CASH'
                    ? 'border-[#543310] bg-[#543310] text-white shadow-md'
                    : 'border-[#E8DED5] bg-white text-[#6B625B] hover:border-[#D67D3E]'
                }`}
              >
                <DollarSign size={16} />
                <span>Tiền mặt tại quầy</span>
              </button>

              <button
                type="button"
                onClick={() => setDepositMethod('VIETQR')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  depositMethod === 'VIETQR'
                    ? 'border-[#543310] bg-[#543310] text-white shadow-md'
                    : 'border-[#E8DED5] bg-white text-[#6B625B] hover:border-[#D67D3E]'
                }`}
              >
                <Clock size={16} />
                <span>VietQR (Chờ CK)</span>
              </button>

              <button
                type="button"
                onClick={() => setDepositMethod('WAIVED')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  depositMethod === 'WAIVED'
                    ? 'border-[#543310] bg-[#543310] text-white shadow-md'
                    : 'border-[#E8DED5] bg-white text-[#6B625B] hover:border-[#D67D3E]'
                }`}
              >
                <CheckCircle2 size={16} />
                <span>Đặc cách / Miễn cọc</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-[#E8DED5] rounded-xl font-bold text-[#6B625B] hover:bg-[#FAF7F3] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[#543310] text-white rounded-xl font-bold hover:bg-[#D67D3E] transition-colors disabled:opacity-50 shadow-md"
            >
              {isSubmitting ? 'Đang tạo...' : 'Xác Nhận Đặt Bàn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
