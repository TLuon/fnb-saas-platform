import { Clock } from 'lucide-react';
import type { AuditLog } from '../../store/supportStore';

interface AuditTimelineProps {
  logs: AuditLog[];
}

export function AuditTimeline({ logs }: AuditTimelineProps) {
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes('PROPOSED')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (action.includes('APPROVED')) return 'bg-green-100 text-green-700 border-green-200';
    if (action.includes('REJECTED')) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8DED5] p-4 shadow-sm mt-6">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
        <Clock size={18} className="text-gray-400" />
        <h3 className="font-bold text-gray-700">Audit Timeline (Nhật ký thao tác)</h3>
      </div>
      
      <div className="space-y-4">
        {logs.map((log, index) => (
          <div key={log.id} className="relative pl-6">
            {/* Line connecting points */}
            {index !== logs.length - 1 && (
              <div className="absolute left-2 top-6 bottom-[-16px] w-0.5 bg-gray-200"></div>
            )}
            {/* Timeline dot */}
            <div className="absolute left-[3px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--color-brand-secondary)] ring-4 ring-white"></div>
            
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-gray-800 text-sm">{log.actor}</span>
                <span className="text-xs text-gray-500">{formatDate(log.timestamp)}</span>
              </div>
              <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-md border ${getActionColor(log.action)}`}>
                {log.action}
              </span>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <p className="text-gray-400 text-sm italic pl-2">Chưa có nhật ký nào.</p>
        )}
      </div>
    </div>
  );
}
