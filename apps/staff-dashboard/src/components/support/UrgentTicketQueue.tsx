import { AlertTriangle } from 'lucide-react';
import type { SupportTicket } from '../../store/ticketStore';

interface UrgentTicketQueueProps {
  tickets: SupportTicket[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function UrgentTicketQueue({ tickets, selectedId, onSelect }: UrgentTicketQueueProps) {
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 className="font-bold text-gray-700">Hàng đợi Ticket (Khiếu nại)</h3>
        <span className="text-xs font-bold bg-gray-200 px-2 py-1 rounded-full">{tickets.length}</span>
      </div>
      <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
        {tickets.map(t => (
          <div 
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`p-4 cursor-pointer transition-all border-l-4 ${
              selectedId === t.id ? 'bg-orange-50 border-l-[var(--color-brand-primary)]' : 
              t.isUrgent ? 'border-l-[#B42318] hover:bg-red-50/50' : 
              'border-l-transparent hover:bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-gray-800">{t.id}</span>
              {t.isUrgent && (
                <div className="flex items-center gap-1 text-[#B42318] bg-red-100 px-2 py-0.5 rounded-full text-xs font-bold">
                  <AlertTriangle size={12} />
                  Khẩn cấp
                </div>
              )}
            </div>
            <div className="text-sm font-semibold text-[var(--color-brand-primary)] mb-1">
              Khách: {t.customerName}
            </div>
            <div className="text-sm text-gray-500 mb-3 line-clamp-2">
              {t.subject}
            </div>
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-gray-400">{formatDate(t.createdAt)}</span>
              <span className={`px-2 py-1 rounded-md ${
                t.status === 'OPEN' ? 'bg-orange-100 text-orange-700' :
                t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                'bg-green-100 text-green-700'
              }`}>
                {t.status === 'OPEN' ? 'Mở' : t.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Đã đóng'}
              </span>
            </div>
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="p-8 text-center text-gray-400 font-medium">
            Không có khiếu nại nào.
          </div>
        )}
      </div>
    </div>
  );
}
