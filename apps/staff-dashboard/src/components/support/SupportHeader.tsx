import { Activity, Bell } from 'lucide-react';

interface SupportHeaderProps {
  connected: boolean;
  pendingCount: number;
}

export function SupportHeader({ connected, pendingCount }: SupportHeaderProps) {
  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-black font-serif text-[var(--color-brand-primary)]">Support Board</h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-200">
          <Activity size={14} className={connected ? 'text-green-500' : 'text-red-500'} />
          <span className="text-sm font-semibold text-gray-600">
            {connected ? 'Realtime Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <Bell size={24} className="text-gray-500" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-brand-error)] text-[10px] font-bold text-white border-2 border-white">
              {pendingCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
