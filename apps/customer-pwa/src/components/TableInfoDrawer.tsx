import React from 'react';
import { X, Users, MapPin } from 'lucide-react';
import { useAuthGuard } from '../hooks/useAuthGuard';

interface TableInfoDrawerProps {
  table: any;
  isOpen: boolean;
  onClose: () => void;
  onSelectTable: (table: any) => void;
}

export function TableInfoDrawer({ table, isOpen, onClose, onSelectTable }: TableInfoDrawerProps) {
  const { requireAuth } = useAuthGuard();

  if (!isOpen || !table) return null;

  const isAvailable = table.status === 'AVAILABLE';

  const handleSelect = () => {
    requireAuth(() => {
      onSelectTable(table);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 transition-opacity">
      <div 
        className="bg-[#FFFFFF] w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#E8DED5]">
          <h3 className="font-bold text-lg text-[#543310]">Thông tin bàn</h3>
          <button onClick={onClose} className="p-2 text-[#6B625B] hover:bg-[#FAF7F3] rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-bold text-[#222222] mb-1">{table.code}</h2>
              <div className="flex items-center gap-2 text-[#6B625B] text-sm">
                <Users size={16} />
                <span>Sức chứa: {table.capacity} người</span>
              </div>
            </div>
            <div className={`px-3 py-1 rounded text-sm font-bold shadow-sm ${
              isAvailable ? 'bg-[#E2F3E5] text-[#222222] border border-[#8AD199]' : 
              table.status === 'PENDING_LOCK' ? 'bg-[#FED8B1] text-[#543310] border border-[#D67D3E]' :
              'bg-[#E8DED5] text-[#6B625B]'
            }`}>
              {isAvailable ? 'Bàn trống' : table.status === 'PENDING_LOCK' ? 'Đang giữ' : 'Không khả dụng'}
            </div>
          </div>

          <p className="text-sm text-[#6B625B] mb-6 flex items-center gap-2">
            <MapPin size={16} className="text-[#D67D3E]" />
            Khu vực: Tầng hiện tại
          </p>

          <button
            onClick={handleSelect}
            disabled={!isAvailable}
            className={`w-full py-3 rounded-xl font-bold transition-colors ${
              isAvailable 
                ? 'bg-[#543310] text-white hover:bg-[#D67D3E]' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isAvailable ? 'Chọn bàn này' : 'Bàn đã có khách'}
          </button>
        </div>
      </div>
    </div>
  );
}
