import { useState } from 'react';
import { useTicketStore } from '../store/ticketStore';
import { Star, MessageSquareWarning, Gift, CheckCircle } from 'lucide-react';

export default function SupportTickets() {
  const { tickets, resolveTicket } = useTicketStore();
  const [showVoucherModal, setShowVoucherModal] = useState<string | null>(null);

  const handleSendVoucher = (txId: string) => {
    resolveTicket(txId, 'CSAT-APOLOGY-50K');
    setShowVoucherModal(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">Quản lý Khiếu nại</h2>
          <p className="text-gray-500 mt-2">Xử lý đánh giá trải nghiệm khách hàng (≤ 2 Sao)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tickets.map(tk => (
          <div key={tk.id} className={`p-6 rounded-3xl shadow-sm border ${tk.status === 'OPEN' ? 'bg-white border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl text-white ${tk.status === 'OPEN' ? 'bg-red-500' : 'bg-gray-400'}`}>
                  <MessageSquareWarning size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-brand-primary)]">{tk.customerName}</h3>
                  <p className="text-sm text-gray-500">Mã Ticket: {tk.id}</p>
                </div>
              </div>
              <div className="flex gap-1 text-red-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill={i < tk.rating ? 'currentColor' : 'none'} className={i < tk.rating ? '' : 'text-gray-300'} />
                ))}
              </div>
            </div>

            <div className="bg-[var(--color-brand-neutral)] p-4 rounded-xl mb-4 border border-gray-100">
              <p className="italic text-gray-700">"{tk.feedback}"</p>
            </div>

            <div className="flex items-center justify-between">
              {tk.status === 'OPEN' ? (
                <>
                  <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Cần xử lý</span>
                  <button 
                    onClick={() => setShowVoucherModal(tk.id)}
                    className="flex items-center gap-2 bg-[var(--color-brand-primary)] text-white px-4 py-2 rounded-xl font-bold hover:bg-[var(--color-brand-secondary)] transition shadow-md"
                  >
                    <Gift size={18} />
                    Gửi Voucher Đền bù
                  </button>
                </>
              ) : (
                <>
                  <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle size={14} /> Đã giải quyết
                  </span>
                  <p className="text-sm text-gray-500">
                    Đã gửi voucher: <span className="font-bold text-[var(--color-brand-secondary)]">{tk.compensationVoucher}</span>
                  </p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="ticket-punch bg-gradient-to-br from-[var(--color-brand-accent)] to-[#fff0e0] w-full max-w-md p-8 shadow-2xl text-center relative">
            <div 
              className="absolute top-0 left-0 w-full h-2 opacity-20"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, var(--color-brand-secondary) 10px, var(--color-brand-secondary) 20px)' }}
            ></div>
            <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center text-[var(--color-brand-secondary)] mb-4 shadow-inner">
              <Gift size={40} />
            </div>
            <h3 className="text-3xl font-black font-serif text-[var(--color-brand-primary)] mb-2">Tặng Voucher Đền Bù</h3>
            <p className="text-[var(--color-brand-primary)] opacity-70 mb-8 text-sm font-medium">Hệ thống sẽ gửi tặng Voucher trị giá 50.000đ vào Ví của khách hàng để xin lỗi về trải nghiệm không tốt.</p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setShowVoucherModal(null)}
                className="flex-1 bg-white/50 text-[var(--color-brand-primary)] font-bold px-4 py-3 rounded-xl hover:bg-white transition shadow-sm"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => handleSendVoucher(showVoucherModal)}
                className="flex-1 bg-[var(--color-brand-primary)] text-[var(--color-brand-accent)] font-bold px-4 py-3 rounded-xl hover:bg-[#3d250b] transition shadow-md"
              >
                Xác nhận Gửi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
