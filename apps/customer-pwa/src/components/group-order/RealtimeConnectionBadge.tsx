import React from 'react';

export type SocketStatus = 'CONNECTED' | 'RECONNECTING' | 'OFFLINE';

interface RealtimeConnectionBadgeProps {
  status: SocketStatus;
}

export function RealtimeConnectionBadge({ status }: RealtimeConnectionBadgeProps) {
  const config = {
    CONNECTED: { color: 'bg-[#237A57]', label: 'Đã đồng bộ' },
    RECONNECTING: { color: 'bg-[#D67D3E]', label: 'Đang kết nối lại...' },
    OFFLINE: { color: 'bg-[#B42318]', label: 'Mất kết nối' }
  };

  const curr = config[status];

  return (
    <div className="flex items-center gap-2 bg-[#FAF7F3] border border-[#E8DED5] rounded-full px-3 py-1 shadow-sm">
      <div className={`w-2 h-2 rounded-full ${curr.color} ${status === 'RECONNECTING' ? 'animate-pulse' : ''}`} />
      <span className="text-[10px] font-bold text-[#6B625B] uppercase tracking-wider">{curr.label}</span>
    </div>
  );
}
