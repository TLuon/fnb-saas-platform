'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TableLockModal } from '../../../components/TableLockModal';
import { useToast } from '../../../components/ToastProvider';
import FloorMapDynamic from '../../../components/FloorMapDynamic';
import type { FloorTable } from '../../../components/FloorMapGrid';

export default function FloorPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockingTable, setLockingTable] = useState<string | null>(null);
  const [reservationCode, setReservationCode] = useState<string>('');
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const { showError, showInfo } = useToast();

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      let token = '';
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
        token = match ? decodeURIComponent(match[1]) : (localStorage.getItem('access_token') || '');
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let targetFloorId = id;

      // If id is not a UUID (e.g. '1'), query floors by branch_id to find real floor id
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (!isUuid) {
        const branchId = '22222222-2222-2222-2222-222222222222';
        const floorRes = await fetch(`${baseUrl}/floors?branch_id=${branchId}`, { headers });
        if (floorRes.ok) {
          const floors = await floorRes.json();
          if (Array.isArray(floors) && floors.length > 0) {
            targetFloorId = floors[0].id;
          }
        }
      }

      const res = await fetch(`${baseUrl}/floors/${targetFloorId}/tables`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: FloorTable[] = data.map((t: any) => ({
            id: t.id,
            name: t.table_code || `Bàn ${t.id.slice(0, 3)}`,
            status: t.status || 'AVAILABLE',
          }));
          setTables(mapped);
          return;
        }
      }

      // Fallback if empty
      setTables([
        { id: 'T01', name: 'Bàn B01', status: 'AVAILABLE' },
        { id: 'T02', name: 'Bàn B02', status: 'AVAILABLE' },
        { id: 'T03', name: 'Bàn B03', status: 'OCCUPIED' },
        { id: 'T04', name: 'Bàn B04', status: 'AVAILABLE' },
      ]);
    } catch (err: any) {
      console.error('Failed to load tables', err);
      showError('Không thể tải sơ đồ bàn từ máy chủ');
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleTableClick = async (table: FloorTable) => {
    if (table.status !== 'AVAILABLE') {
      showError(`Bàn này hiện không trống (Trạng thái: ${table.status})`);
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      let token = '';
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
        token = match ? decodeURIComponent(match[1]) : (localStorage.getItem('access_token') || '');
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Call real reservation lock API
      const lockRes = await fetch(`${baseUrl}/reservations/lock`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ table_id: table.id }),
      });

      if (lockRes.ok) {
        const lockData = await lockRes.json();
        setReservationCode(lockData.reservation_code || '');
      } else {
        setReservationCode(`RES_${table.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4)}_${Date.now().toString().slice(-4)}`);
      }
    } catch (err) {
      setReservationCode(`RES_${table.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4)}_${Date.now().toString().slice(-4)}`);
    }

    setLockingTable(table.id);
    setLockedUntil(Date.now() + 600 * 1000); // 10 minutes from now
    
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: 'PENDING_LOCK' } : t));
  };

  const handleCancelLock = useCallback(async () => {
    if (reservationCode) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        let token = '';
        if (typeof document !== 'undefined') {
          const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
          token = match ? decodeURIComponent(match[1]) : (localStorage.getItem('access_token') || '');
        }
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        await fetch(`${baseUrl}/reservations/${encodeURIComponent(reservationCode)}`, {
          method: 'DELETE',
          headers,
        });
      } catch (e) {
        console.warn('Cancel reservation call error', e);
      }
    }

    if (lockingTable) {
      setTables(prev => prev.map(t => t.id === lockingTable ? { ...t, status: 'AVAILABLE' } : t));
    }
    setLockingTable(null);
    setLockedUntil(null);
    setReservationCode('');
    showInfo('Đã hủy giữ bàn');
  }, [lockingTable, reservationCode, showInfo]);

  const handleTimeout = useCallback(() => {
    if (lockingTable) {
      setTables(prev => prev.map(t => t.id === lockingTable ? { ...t, status: 'AVAILABLE' } : t));
    }
    setLockingTable(null);
    setLockedUntil(null);
    setReservationCode('');
    showError('Hết thời gian giữ bàn');
  }, [lockingTable, showError]);

  const handleSuccess = useCallback(() => {
    if (lockingTable) {
      setTables(prev => prev.map(t => t.id === lockingTable ? { ...t, status: 'RESERVED' } : t));
    }
    setLockingTable(null);
    setLockedUntil(null);
    setReservationCode('');
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

      {loading ? (
        <div className="text-center py-12 text-gray-400">Đang tải sơ đồ bàn...</div>
      ) : (
        <FloorMapDynamic tables={tables} onTableClick={handleTableClick} />
      )}

      {lockingTable && (
        <TableLockModal 
          tableId={lockingTable}
          lockedUntil={lockedUntil}
          code={reservationCode}
          onCancel={handleCancelLock}
          onSuccess={handleSuccess}
          onTimeout={handleTimeout}
        />
      )}
    </div>
  );
}
