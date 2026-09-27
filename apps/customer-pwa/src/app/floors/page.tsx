'use client';

import React, { useEffect, useState } from 'react';
import { PublicHeader } from '../../components/PublicHeader';
import { FloorTabs } from '../../components/FloorTabs';
import { TableStatusLegend } from '../../components/TableStatusLegend';
import { TableInfoDrawer } from '../../components/TableInfoDrawer';
import { FloorMapCanvas } from '@fnb/ui-shared';
import { apiClient, authStore, mapApiTableToCanvas } from '@fnb/utils';
import { useStore } from 'zustand';
import { useToast } from '../../components/ToastProvider';
import { LoadingSkeleton, EmptyState } from '@fnb/ui-shared';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { LoginRequiredModal } from '../../components/LoginRequiredModal';
import { io } from 'socket.io-client';

export default function FloorsPage() {
  const router = useRouter();
  const { showInfo, showError } = useToast();
  const { showLoginModal, setShowLoginModal } = useAuthGuard();
  const isAuthenticated = useStore(authStore, (state) => state.isAuthenticated);

  const [branches, setBranches] = useState<any[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [floors, setFloors] = useState<any[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  
  const [loadingFloors, setLoadingFloors] = useState(true);
  const [floorsError, setFloorsError] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tablesError, setTablesError] = useState(false);
  const [lockingTable, setLockingTable] = useState(false);
  
  const [selectedTable, setSelectedTable] = useState<any | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoadingFloors(false);
      return;
    }

    const fetchBranches = async () => {
      try {
        setLoadingFloors(true);
        setFloorsError(false);
        const res = await apiClient.get('/branches');
        const data = Array.isArray(res) ? res : (res?.data || []);
        setBranches(data);
        const configuredBranchId = process.env.NEXT_PUBLIC_BRANCH_ID;
        const initialBranch = data.find((branch: any) => branch.id === configuredBranchId) || data[0];
        setActiveBranchId(initialBranch?.id || null);
      } catch (error) {
        console.error('Failed to fetch branches', error);
        setFloorsError(true);
      } finally {
        setLoadingFloors(false);
      }
    };

    void fetchBranches();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!activeBranchId) {
      setFloors([]);
      setActiveFloorId(null);
      return;
    }

    const fetchFloors = async () => {
      try {
        setLoadingFloors(true);
        setFloorsError(false);
        const res = await apiClient.get(`/floors?branch_id=${encodeURIComponent(activeBranchId)}`);
        const data = Array.isArray(res) ? res : (res?.data || []);
        setFloors(data);
        setActiveFloorId(data[0]?.id || null);
      } catch (error) {
        console.error('Failed to fetch floors', error);
        setFloorsError(true);
      } finally {
        setLoadingFloors(false);
      }
    };

    void fetchFloors();
  }, [activeBranchId]);

  const fetchTables = async (floorId: string) => {
    try {
      setLoadingTables(true);
      setTablesError(false);
      const res = await apiClient.get(`/floors/${floorId}/tables`);
      const data = Array.isArray(res) ? res : (res?.data || []);
      const mappedTables = data.map(mapApiTableToCanvas);
      setTables(mappedTables);
    } catch (error) {
      console.error('Failed to fetch tables', error);
      setTablesError(true);
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    if (!activeFloorId) return;
    fetchTables(activeFloorId);
  }, [activeFloorId]);

  // Realtime updates for tables
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket = io(wsUrl);

    socket.on('connect', () => {
      // Reconnect logic: fetch snapshot again to avoid missed events
      if (activeFloorId) {
        fetchTables(activeFloorId);
      }
    });

    socket.on('table_status_changed', (data: { table_id: string, status: string }) => {
      setTables(prev => prev.map(t => 
        t.id === data.table_id ? { ...t, status: data.status } : t
      ));
    });

    return () => {
      socket.disconnect();
    };
  }, [activeFloorId]);

  const handleSelectTable = async (table: any) => {
    try {
      setLockingTable(true);
      showInfo(`Đang giữ bàn ${table.code}...`);
      
      const payload: any = await apiClient.post('/reservations/lock', { table_id: table.id });
      
      const reservationCode = payload?.reservation_code || payload?.code;
      if (!reservationCode) throw new Error('API không trả mã đặt bàn');
      router.push(`/reservation/${reservationCode}?tableName=${encodeURIComponent(table.name)}`);
    } catch (error: any) {
      if (error?.code === 'ERR_2002_TABLE_LOCKED' || error?.response?.data?.code === 'ERR_2002_TABLE_LOCKED') {
        showError('Bàn đã bị khách khác giữ. Vui lòng chọn bàn khác.');
        // Refresh tables to get updated state
        if (activeFloorId) fetchTables(activeFloorId);
      } else {
        showError('Không thể giữ bàn lúc này, vui lòng thử lại.');
      }
    } finally {
      setLockingTable(false);
      setSelectedTable(null);
    }
  };

  const isNoAvailableTable = !loadingTables && tables.length > 0 && !tables.some(t => t.status === 'AVAILABLE');

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col pb-24">
      <PublicHeader />

      {branches.length > 1 && (
        <div className="border-b border-[#E8DED5] bg-white px-4 py-3">
          <label className="mx-auto flex max-w-screen-xl items-center gap-3 text-sm font-bold text-[#543310]">
            Chi nhánh
            <select
              value={activeBranchId || ''}
              onChange={(event) => setActiveBranchId(event.target.value)}
              className="min-w-0 flex-1 border border-[#E8DED5] bg-white px-3 py-2 font-medium outline-none focus:border-[#D67D3E] sm:max-w-sm"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      
      {loadingFloors ? (
        <div className="p-4"><LoadingSkeleton className="w-full h-12" /></div>
      ) : floorsError ? (
        <div className="p-4 text-center text-[#B42318]">Lỗi tải tầng.</div>
      ) : (
        <FloorTabs 
          floors={floors} 
          activeId={activeFloorId} 
          onSelect={setActiveFloorId} 
        />
      )}

      <div className="p-4 max-w-screen-xl mx-auto w-full">
        <h2 className="text-2xl font-bold font-serif text-[#543310] mb-4">Sơ đồ tầng</h2>
        
        {isNoAvailableTable && (
          <div className="mb-4 p-4 bg-[#FEE4E2] border border-[#FDA29B] rounded-xl text-[#B42318] font-bold text-center">
            Hiện tại tầng này đã hết bàn trống (NoAvailableTable).
          </div>
        )}

        {loadingTables ? (
          <div className="flex flex-col items-center justify-center h-[600px] border border-[#E8DED5] rounded-xl bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#543310]"></div>
            <p className="mt-4 text-[#6B625B]">Đang tải sơ đồ bàn...</p>
          </div>
        ) : tablesError ? (
          <EmptyState title="Không thể tải sơ đồ bàn" message="Vui lòng thử lại sau ít phút." />
        ) : (
          <FloorMapCanvas 
            editable={false} 
            tables={tables} 
            onTableClick={(t) => {
              if (lockingTable) return;
              const shapeBase = (t.shape || '').split(':')[0].toLowerCase();
              const isDecor = t.capacity === 0 || ['door', 'stairs', 'plant', 'window', 'balcony', 'wc', 'counter', 'aquarium'].includes(shapeBase);
              if (isDecor) return;
              setSelectedTable(t);
            }}
          />
        )}

        <TableStatusLegend />
      </div>

      <TableInfoDrawer 
        table={selectedTable}
        isOpen={!!selectedTable}
        onClose={() => setSelectedTable(null)}
        onSelectTable={handleSelectTable}
      />

      <LoginRequiredModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        returnUrl="/floors" 
      />
    </main>
  );
}
