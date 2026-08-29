'use client';

import React, { useState } from 'react';
import { getTableColor, TableStatus } from '@fnb/utils';
import { TableLockModal } from '../../../components/TableLockModal';
import { useToast } from '../../../components/ToastProvider';

interface Table {
  id: string;
  name: string;
  status: TableStatus;
}

const INITIAL_TABLES: Table[] = [
  { id: 'T01', name: 'Bàn 1', status: 'AVAILABLE' },
  { id: 'T02', name: 'Bàn 2', status: 'AVAILABLE' },
  { id: 'T03', name: 'Bàn 3', status: 'OCCUPIED' },
  { id: 'T04', name: 'Bàn 4', status: 'AVAILABLE' },
  { id: 'T05', name: 'Bàn 5', status: 'CLEANING' },
  { id: 'T06', name: 'Bàn 6', status: 'PENDING_LOCK' },
];

export default function FloorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [lockingTable, setLockingTable] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const { showError, showInfo } = useToast();

  const handleTableClick = (table: Table) => {
    if (table.status !== 'AVAILABLE') {
      showError(`Bàn này hiện không trống (Trạng thái: ${table.status})`);
      return;
    }

    setLockingTable(table.id);
    setLockedUntil(Date.now() + 600 * 1000); // 10 minutes from now
    
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: 'PENDING_LOCK' } : t));
  };

  const handleCancelLock = () => {
    if (lockingTable) {
      setTables(prev => prev.map(t => t.id === lockingTable ? { ...t, status: 'AVAILABLE' } : t));
    }
    setLockingTable(null);
    setLockedUntil(null);
    showInfo('Đã hủy giữ bàn');
  };

  const handleTimeout = () => {
    if (lockingTable) {
      setTables(prev => prev.map(t => t.id === lockingTable ? { ...t, status: 'AVAILABLE' } : t));
    }
    setLockingTable(null);
    setLockedUntil(null);
    showError('Hết thời gian giữ bàn');
  };

  const handleSuccess = () => {
    if (lockingTable) {
      setTables(prev => prev.map(t => t.id === lockingTable ? { ...t, status: 'RESERVED' } : t));
    }
    setLockingTable(null);
    setLockedUntil(null);
    showInfo('Thanh toán thành công. Bàn đã được đặt!');
  };

  return (
    <div className="min-h-screen bg-[var(--color-brand-neutral)] p-6">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">
          Sơ đồ Tầng {id}
        </h1>
        <p className="text-gray-500 mt-3 font-medium tracking-wide">Vui lòng chọn một bàn trống để giữ chỗ và bắt đầu gọi món.</p>
        <div className="w-24 h-1 bg-[var(--color-brand-secondary)] mx-auto mt-4 rounded-full opacity-50"></div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map(table => {
          const bgColor = getTableColor(table.status);
          const isWhiteText = table.status === 'OCCUPIED' || table.status === 'RESERVED';
          
          return (
            <div 
              key={table.id}
              onClick={() => handleTableClick(table)}
              style={{ backgroundColor: bgColor }}
              className={`
                relative h-36 rounded-3xl shadow-sm border border-white/50 backdrop-blur-md
                flex flex-col items-center justify-center cursor-pointer
                transition-all duration-300 hover:-translate-y-2 hover:shadow-xl
                ${isWhiteText ? 'text-white' : 'text-[var(--color-brand-primary)]'}
                ${table.status === 'PENDING_LOCK' ? 'animate-pulse ring-4 ring-[var(--color-brand-secondary)]/50 ring-offset-2' : ''}
              `}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl pointer-events-none"></div>
              <span className="text-3xl font-black font-serif z-10">{table.name}</span>
              <span className="text-xs font-bold mt-2 opacity-90 uppercase tracking-widest z-10 px-3 py-1 bg-black/10 rounded-full">{table.status}</span>
            </div>
          );
        })}
      </div>

      <TableLockModal 
        tableId={lockingTable!}
        lockedUntil={lockedUntil}
        onCancel={handleCancelLock}
        onSuccess={handleSuccess}
        onTimeout={handleTimeout}
      />
    </div>
  );
}
