'use client';

import React, { useState, useCallback } from 'react';
import { TableStatus } from '@fnb/utils';
import { TableLockModal } from '../../../components/TableLockModal';
import { useToast } from '../../../components/ToastProvider';
import FloorMapDynamic from '../../../components/FloorMapDynamic';
import type { FloorTable } from '../../../components/FloorMapGrid';

const INITIAL_TABLES: FloorTable[] = [
  { id: 'T01', name: 'Bàn 1', status: 'AVAILABLE' },
  { id: 'T02', name: 'Bàn 2', status: 'AVAILABLE' },
  { id: 'T03', name: 'Bàn 3', status: 'OCCUPIED' },
  { id: 'T04', name: 'Bàn 4', status: 'AVAILABLE' },
  { id: 'T05', name: 'Bàn 5', status: 'CLEANING' },
  { id: 'T06', name: 'Bàn 6', status: 'PENDING_LOCK' },
];

export default function FloorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [tables, setTables] = useState<FloorTable[]>(INITIAL_TABLES);
  const [lockingTable, setLockingTable] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const { showError, showInfo } = useToast();

  const handleTableClick = (table: FloorTable) => {
    if (table.status !== 'AVAILABLE') {
      showError(`Bàn này hiện không trống (Trạng thái: ${table.status})`);
      return;
    }

    setLockingTable(table.id);
    setLockedUntil(Date.now() + 600 * 1000); // 10 minutes from now
    
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: 'PENDING_LOCK' } : t));
  };

  const handleCancelLock = useCallback(() => {
    if (lockingTable) {
      setTables(prev => prev.map(t => t.id === lockingTable ? { ...t, status: 'AVAILABLE' } : t));
    }
    setLockingTable(null);
    setLockedUntil(null);
    showInfo('Đã hủy giữ bàn');
  }, [lockingTable, showInfo]);

  const handleTimeout = useCallback(() => {
    if (lockingTable) {
      setTables(prev => prev.map(t => t.id === lockingTable ? { ...t, status: 'AVAILABLE' } : t));
    }
    setLockingTable(null);
    setLockedUntil(null);
    showError('Hết thời gian giữ bàn');
  }, [lockingTable, showError]);

  const handleSuccess = useCallback(() => {
    if (lockingTable) {
      setTables(prev => prev.map(t => t.id === lockingTable ? { ...t, status: 'RESERVED' } : t));
    }
    setLockingTable(null);
    setLockedUntil(null);
    showInfo('Thanh toán thành công. Bàn đã được đặt!');
  }, [lockingTable, showInfo]);

  return (
    <div className="min-h-screen bg-[var(--color-brand-neutral)] p-6">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">
          Sơ đồ Tầng {id}
        </h1>
        <p className="text-gray-500 mt-3 font-medium tracking-wide">Vui lòng chọn một bàn trống để giữ chỗ và bắt đầu gọi món.</p>
        <div className="w-24 h-1 bg-[var(--color-brand-secondary)] mx-auto mt-4 rounded-full opacity-50"></div>
      </header>

      <FloorMapDynamic tables={tables} onTableClick={handleTableClick} />

      {lockingTable && (
        <TableLockModal 
          tableId={lockingTable}
          lockedUntil={lockedUntil}
          onCancel={handleCancelLock}
          onSuccess={handleSuccess}
          onTimeout={handleTimeout}
        />
      )}
    </div>
  );
}

