import { CheckSquare, X } from 'lucide-react';
import type { SupportTicket } from '../../store/ticketStore';

interface TicketDetailPanelProps {
  ticket: SupportTicket | null;
  onClose: () => void;
  onResolveClick: () => void;
}

export function TicketDetailPanel({ ticket, onClose, onResolveClick }: TicketDetailPanelProps) {
  if (!ticket) return null;

  return (
    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[800px]">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[var(--color-brand-neutral)]">
        <h2 className="font-bold text-lg text-[var(--color-brand-primary)]">Chi tiết Ticket {ticket.id}</h2>
        <button onClick={onClose} className="p-1 text-gray-500 hover:text-[var(--color-brand-error)] transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 bg-[#FAF7F3]">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6">
          <h3 className="font-black text-xl text-gray-800 mb-4">{ticket.subject}</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500 uppercase font-bold mb-1">Khách hàng</p>
              <p className="font-bold text-[var(--color-brand-primary)]">{ticket.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase font-bold mb-1">Trạng thái</p>
              <p className="font-bold text-gray-700">{ticket.status}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-700">
            (Nội dung chat / thông tin chi tiết sẽ được tích hợp ở giai đoạn sau của MVP. Hiện tại nhân viên hỗ trợ liên hệ trực tiếp với khách hàng qua SĐT để giải quyết).
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={onResolveClick}
            disabled={ticket.status === 'RESOLVED'}
            className="px-6 py-3 bg-[var(--color-brand-primary)] text-white font-bold rounded-xl hover:bg-[#3d250c] transition disabled:opacity-50 flex items-center gap-2"
          >
            <CheckSquare size={20} />
            Đóng Ticket (Resolve)
          </button>
        </div>
      </div>
    </div>
  );
}
