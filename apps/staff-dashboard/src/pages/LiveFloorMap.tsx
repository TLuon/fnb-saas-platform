import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloorMapCanvas, FloorTableCanvas, TableStatusLegend } from '@fnb/ui-shared';
import { apiClient, authStore, RealtimeClient, mapApiTableToCanvas } from '@fnb/utils';
import { useStore } from 'zustand';
import { getSocketBaseUrl } from '../lib/kds';

interface Floor {
  id: string;
  name: string;
}

import { useModal } from '../components/ModalProvider';

const LiveFloorMap: React.FC = () => {
  const { showAlert } = useModal();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [tables, setTables] = useState<FloorTableCanvas[]>([]);
  const [selectedTable, setSelectedTable] = useState<FloorTableCanvas | null>(null);
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [activeReservation, setActiveReservation] = useState<any>(null);
  const [debugLog, setDebugLog] = useState<string>('');

  const branchId = useStore(authStore, (state) => state.branchId);
  const accessToken = useStore(authStore, (state) => state.accessToken);
  const selectedFloorRef = React.useRef(selectedFloor);
  
  useEffect(() => {
    selectedFloorRef.current = selectedFloor;
  }, [selectedFloor]);

  useEffect(() => {
    if (selectedTable && selectedTable.current_order_id) {
       apiClient.get(`/orders/${selectedTable.current_order_id}`)
         .then((res: any) => setActiveOrder(res?.order || res.data?.data?.order || res.data?.order || res.data || res))
         .catch(() => setActiveOrder(null));
       setActiveReservation(null);
    } else if (selectedTable && (selectedTable.status === 'RESERVED' || selectedTable.status === 'PENDING_LOCK')) {
       setActiveOrder(null);
       apiClient.get(`/reservations?table_id=${selectedTable.id}&limit=5`)
         .then((res: any) => {
           // Because apiClient intercepts the response, res is directly the array.
           const reservations = Array.isArray(res) ? res : (res.data?.data || res.data || res || []);
           const activeRes = reservations.find((r: any) => r.status === 'PAID' || r.status === 'PENDING');
           if (!activeRes) {
             setDebugLog(`Table ${selectedTable.id} -> Found ${reservations.length} res. Data: ${JSON.stringify(reservations).slice(0, 100)}`);
           } else {
             setDebugLog('');
           }
           setActiveReservation(activeRes || null);
         })
         .catch((err) => {
           setDebugLog('Error: ' + (err.response?.data?.message || err.message));
           setActiveReservation(null);
         });
    } else {
       setActiveOrder(null);
       setActiveReservation(null);
    }
  }, [selectedTable]);

  const fetchTables = useCallback((floorId: string) => {
    if (!floorId) return;
    setIsLoading(true);
    apiClient.get(`/floors/${floorId}/tables`)
      .then((res: any) => {
        const mappedTables: FloorTableCanvas[] = (res.data?.data || res.data || res || []).map(mapApiTableToCanvas);
        setTables(mappedTables);
        setLastUpdated(new Date());
        setError('');
      })
      .catch(() => setError('Không thể tải danh sách bàn'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!branchId) {
      setFloors([]);
      setTables([]);
      setIsLoading(false);
      setError('Tài khoản chưa được gán chi nhánh');
      return;
    }

    apiClient.get(`/api/v1/floors?branch_id=${branchId}`)
      .then((res: any) => {
        const floorList = res.data?.data || res.data || res || [];
        setFloors(floorList);
        if (floorList.length > 0) setSelectedFloor(floorList[0].id);
      })
      .catch(() => setError('Không thể tải danh sách tầng'));
  }, [branchId]);

  useEffect(() => {
    if (!selectedFloor || !branchId || !accessToken) return;
    
    // Initial fetch
    fetchTables(selectedFloor);

    // Realtime setup
    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    const client = new RealtimeClient({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      socketUrl: import.meta.env.VITE_SOCKET_URL || getSocketBaseUrl(apiUrl),
      token: accessToken,
    });

    client.socket.on('connect', () => {
      setIsConnected(true);
      fetchTables(selectedFloorRef.current);
    });
    
    client.socket.on('disconnect', () => setIsConnected(false));
    
    client.socket.on('table_status_changed', (data: any) => {
      const currentFloor = selectedFloorRef.current;
      if (data.floor_id === currentFloor || !data.floor_id) {
        fetchTables(currentFloor);
      }
    });

    client.connect();

    const snapshotInterval = window.setInterval(
      () => fetchTables(selectedFloorRef.current),
      10000,
    );

    return () => {
      window.clearInterval(snapshotInterval);
      client.disconnect();
    };
  }, [accessToken, branchId, fetchTables, selectedFloor]);

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTable) return;
    try {
      await apiClient.patch(`/tables/${selectedTable.id}/status`, { status: newStatus });
      // Optimistic update
      setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, status: newStatus as any } : t));
      setSelectedTable({ ...selectedTable, status: newStatus as any });
    } catch (err) {
      showAlert('Không thể cập nhật trạng thái bàn lúc này', 'error', 'Lỗi Cập Nhật');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF7F3] overflow-hidden rounded-xl border border-[#E8DED5]">
      <header className="bg-white border-b border-[#E8DED5] p-4 flex justify-between items-center shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-[#543310]">Live Floor Map</h1>
          <select 
            className="border border-[#E8DED5] text-[#543310] rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#D67D3E]"
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            disabled={isLoading}
          >
            {floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="text-gray-500">Cập nhật lúc: {lastUpdated.toLocaleTimeString()}</span>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-white ${isConnected ? 'bg-[#237A57]' : 'bg-[#B42318]'}`}>
            <div className={`w-2 h-2 rounded-full bg-white ${isConnected ? 'animate-pulse' : ''}`}></div>
            {isConnected ? 'Connected' : 'Offline'}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 p-4 relative min-w-0">
          {error && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#B42318] text-white px-4 py-2 rounded shadow-lg z-20 flex gap-4 items-center">
              <span>{error}</span>
              <button onClick={() => setError('')} className="font-bold underline">Đóng</button>
            </div>
          )}

          <div className="absolute bottom-4 left-4 z-10">
            <TableStatusLegend />
          </div>

          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-white rounded-lg border border-[#E8DED5] shadow-inner text-gray-400">
              <span className="animate-pulse font-medium">Đang tải sơ đồ trực tiếp...</span>
            </div>
          ) : tables.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-lg border border-[#E8DED5] shadow-inner text-gray-400">
              <span className="text-4xl mb-4">🪑</span>
              <span className="font-medium text-lg">Tầng này chưa có bàn nào</span>
              <p className="text-sm mt-2">Vui lòng dùng công cụ Floor Editor để thiết kế sơ đồ.</p>
            </div>
          ) : (
            <FloorMapCanvas 
              tables={tables} 
              editable={false}
              selectedTableId={selectedTable?.id}
              onTableClick={setSelectedTable}
              onTableSelect={setSelectedTable}
            />
          )}
        </div>

        {/* Action Drawer */}
        {selectedTable && (
          <div className="w-80 lg:w-[340px] shrink-0 bg-white border-l border-[#E8DED5] p-6 shadow-[-4px_0_15px_rgba(0,0,0,0.05)] z-10 flex flex-col overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-[#543310]">{selectedTable.name}</h2>
              <button onClick={() => setSelectedTable(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Trạng thái hiện tại</p>
              <div className="inline-block px-3 py-1 rounded font-bold text-sm bg-gray-100 border text-[#543310]">
                {selectedTable.status}
              </div>
            </div>

            {activeOrder && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-center font-bold text-[#543310] border-b border-amber-200 pb-2 mb-2">
                  <span>Đơn hiện tại (#{activeOrder.order_code || activeOrder.id?.slice(0, 6)})</span>
                  <span>{Number(activeOrder.final_amount || activeOrder.subtotal || 0).toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="space-y-1 text-gray-700 max-h-32 overflow-y-auto">
                  {activeOrder.order_items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span>{it.quantity}x {it.product_name}</span>
                      <span className="font-medium">{(it.quantity * it.unit_price).toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeReservation && !activeOrder && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <div className="font-bold text-[#1E3A8A] border-b border-blue-200 pb-2 mb-2">
                  Thông tin Đặt bàn (#{activeReservation.reservation_code})
                </div>
                <div className="space-y-2 text-gray-700">
                  <div className="flex justify-between">
                    <span>Khách hàng:</span>
                    <span className="font-medium">{activeReservation.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Số điện thoại:</span>
                    <span className="font-medium">{activeReservation.customer_phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-[#B42318] font-bold">
                    <span>Tiền cọc:</span>
                    <span>{Number(activeReservation.deposit_amount || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </div>
            )}

            {debugLog && (
              <div className="text-red-500 text-xs mb-4 p-2 bg-red-50 border border-red-200 rounded">
                Debug: {debugLog}
              </div>
            )}

            <div className="space-y-3 flex-1">
              <h3 className="text-sm font-bold text-[#543310] uppercase tracking-wider mb-2">Hành động nhanh</h3>
              
              {selectedTable.status === 'AVAILABLE' && (
                <button 
                  onClick={() => handleStatusChange('OCCUPIED')}
                  className="w-full bg-[#D67D3E] text-white py-2.5 rounded-lg font-bold shadow-sm hover:bg-orange-700 transition"
                >
                  Mở bàn (Check-in)
                </button>
              )}
              
              {selectedTable.status === 'OCCUPIED' && (
                <button 
                  onClick={() => handleStatusChange('CLEANING')}
                  className="w-full bg-gray-200 text-gray-800 py-2.5 rounded-lg font-bold shadow-sm hover:bg-gray-300 transition"
                >
                  Dọn bàn
                </button>
              )}

              {selectedTable.status === 'CLEANING' && (
                <button 
                  onClick={() => handleStatusChange('AVAILABLE')}
                  className="w-full bg-[#237A57] text-white py-2.5 rounded-lg font-bold shadow-sm hover:bg-green-700 transition"
                >
                  Bàn trống (Sẵn sàng)
                </button>
              )}

              {(selectedTable.status === 'RESERVED' || selectedTable.status === 'PENDING_LOCK') && (
                <>
                  <button 
                    onClick={() => handleStatusChange('AVAILABLE')}
                    className="w-full bg-gray-200 text-gray-800 py-2.5 rounded-lg font-bold shadow-sm hover:bg-gray-300 transition mb-2"
                  >
                    Hủy đặt / Mở khóa
                  </button>
                  <button 
                    onClick={() => handleStatusChange('OCCUPIED')}
                    className="w-full bg-[#D67D3E] text-white py-2.5 rounded-lg font-bold shadow-sm hover:bg-orange-700 transition"
                  >
                    Nhận bàn (Check-in)
                  </button>
                </>
              )}
              
              <button 
                onClick={() => navigate(`/pos?floor_id=${selectedFloor}&table_id=${selectedTable.id}`)}
                className="w-full border-2 border-[#543310] text-[#543310] py-2.5 rounded-lg font-bold hover:bg-orange-50 transition mt-4"
              >
                {activeOrder ? 'Order Thêm (POS)' : 'Tạo Đơn Hàng (POS)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveFloorMap;
