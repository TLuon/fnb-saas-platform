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
import { StaffPhoneBookingModal } from '../components/StaffPhoneBookingModal';

const LiveFloorMap: React.FC = () => {
  const { showAlert } = useModal();
  const [showStaffBookingModal, setShowStaffBookingModal] = useState(false);
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
  const [activeReservations, setActiveReservations] = useState<any[]>([]);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelingTarget, setCancelingTarget] = useState<{ resCode: string; tableId: string } | null>(null);

  const handleOpenCancelModalForTable = async (table: FloorTableCanvas, resCodeParam?: string) => {
    let resCode = resCodeParam || table.reservation_code;
    if (!resCode) {
      try {
        const res: any = await apiClient.get(`/reservations?table_id=${table.id}&limit=5`);
        const reservations = Array.isArray(res) ? res : (res.data?.data || res.data || res || []);
        const activeRes = reservations.find((r: any) => r.status === 'PAID' || r.status === 'PENDING');
        if (activeRes?.reservation_code) {
          resCode = activeRes.reservation_code;
          // We could append to activeReservations here if needed
        }
      } catch (e) {
        console.error(e);
      }
    }

    setCancelingTarget({ resCode: resCode || `TABLE_${table.id}`, tableId: table.id });
    setCancelReason('Khách gọi xin hủy đặt bàn');
    setShowCancelModal(true);
  };

  const handleExecuteCancel = async () => {
    if (!cancelingTarget) return;
    const { resCode, tableId } = cancelingTarget;
    try {
      if (resCode && !resCode.startsWith('TABLE_')) {
        await apiClient.delete(`/reservations/${encodeURIComponent(resCode)}`, {
          data: { reason: cancelReason },
          params: { reason: cancelReason },
        });
      } else {
        await apiClient.patch(`/floors/tables/${tableId}/status`, { status: 'AVAILABLE' });
      }
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'AVAILABLE' as any, reservation_code: undefined } : t));
      if (selectedTable?.id === tableId) {
        setSelectedTable((prev: any) => prev ? { ...prev, status: 'AVAILABLE' as any, reservation_code: undefined } : null);
      }
      setActiveReservations(prev => prev.filter(r => r.reservation_code !== resCode));
      setShowCancelModal(false);
      showAlert('Đã hủy đặt bàn cọc thành công! Khách hàng sẽ nhận được thông báo.', 'success', 'Hủy Đặt Bàn');
    } catch (e: any) {
      console.error(e);
      showAlert(e.response?.data?.message || 'Không thể hủy đặt bàn lúc này', 'error', 'Lỗi Hủy Bàn');
    }
  };

  const branchId = useStore(authStore, (state) => state.branchId);
  const accessToken = useStore(authStore, (state) => state.accessToken);
  const role = useStore(authStore, (state) => state.role);
  const selectedFloorRef = React.useRef(selectedFloor);

  useEffect(() => {
    selectedFloorRef.current = selectedFloor;
  }, [selectedFloor]);

  useEffect(() => {
    if (!selectedTable) {
      setActiveOrder(null);
      setActiveReservations([]);
      return;
    }

    if (selectedTable.current_order_id) {
      apiClient.get(`/orders/${selectedTable.current_order_id}`)
        .then((res: any) => setActiveOrder(res?.order || res.data?.data?.order || res.data?.order || res.data || res))
        .catch(() => setActiveOrder(null));
    } else {
      setActiveOrder(null);
    }

    apiClient.get(`/reservations?table_id=${selectedTable.id}&limit=5`)
      .then((res: any) => {
        const reservations = Array.isArray(res) ? res : (res.data?.data || res.data || res || []);
        const activeResArray = reservations.filter((r: any) => {
          if (!['PAID', 'PENDING', 'PENDING_LOCK', 'CONFIRMED', 'RESERVED'].includes(r.status)) return false;
          const reserveTime = new Date(r.reservation_time).getTime();
          const now = Date.now();
          
          // Match backend logic: skip expired PENDING (older than 15 mins)
          if (r.status === 'PENDING' && reserveTime < now - 15 * 60 * 1000) {
            return false;
          }

          return true; // Show all active upcoming reservations in sidebar
        });
        setActiveReservations(activeResArray || []);
      })
      .catch(() => {
        setActiveReservations([]);
      });
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
    let client: RealtimeClient;

    const initSocket = async () => {
      client = new RealtimeClient({
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        socketUrl: import.meta.env.VITE_SOCKET_URL || getSocketBaseUrl(apiUrl),
        token: accessToken,
      });

      await client.connect();

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

      if (client.socket.connected) {
        setIsConnected(true);
        fetchTables(selectedFloorRef.current);
      }
    };

    initSocket();


    const snapshotInterval = window.setInterval(
      () => fetchTables(selectedFloorRef.current),
      10000,
    );

    return () => {
      window.clearInterval(snapshotInterval);
      if (client) client.disconnect();
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
          <button
            onClick={() => setShowStaffBookingModal(true)}
            className="bg-[#543310] hover:bg-[#D67D3E] text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <span>📞</span>
            <span>Đặt Bàn Qua Điện Thoại</span>
          </button>
          {role === 'OWNER' && (
            <button
              onClick={() => navigate('/floor-editor')}
              className="bg-white hover:bg-orange-50 text-[#543310] border border-[#543310] px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <span>✏️</span>
              <span>Chỉnh Sửa Sơ Đồ Bàn</span>
            </button>
          )}
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
              <span className="text-4xl mb-3">🪑</span>
              <span className="font-bold text-lg text-gray-700">Tầng này chưa có bàn ghế nào</span>
              <p className="text-sm mt-1 text-gray-500 mb-4">Bạn có thể thiết kế sơ đồ mới hoặc sao chép từ Tầng trệt.</p>
              {role === 'OWNER' && (
                <button
                  onClick={() => navigate('/floor-editor')}
                  className="bg-[#D67D3E] hover:bg-[#b86428] text-white px-4 py-2 rounded-xl font-bold text-xs shadow flex items-center gap-1.5 transition"
                >
                  <span>🛠️</span>
                  <span>Chỉnh Sửa & Thêm Bàn Ghế Cho Tầng Này</span>
                </button>
              )}
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

            {activeReservations.length > 0 && !activeOrder && (
              <div className="space-y-4 mb-6">
                {activeReservations.map((reservation: any, idx: number) => (
                  <div key={idx} className="bg-[#FAF7F3] border border-[#E8DED5] rounded-2xl p-4 text-sm shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E8DED5] pb-2 text-[#543310] font-bold">
                      <span className="flex items-center gap-1.5 text-base">
                        👤 Thông Tin Khách Đặt Bàn
                      </span>
                      <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-[#E8DED5] text-[#543310]">
                        #{reservation.reservation_code || 'N/A'}
                      </span>
                    </div>

                    <div className="space-y-2 text-[#222222]">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#6B625B]">Tên khách hàng:</span>
                        <span className="font-bold text-[#543310] text-sm">
                          {reservation.customer_name || 'Khách đặt qua web/phone'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#6B625B]">Số điện thoại:</span>
                        <span className="font-bold text-[#543310]">
                          {reservation.customer_phone || 'Chưa cung cấp'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#6B625B]">Khung giờ đặt:</span>
                        <span className="font-bold text-[#543310]">
                          {reservation.booking_time || new Date(reservation.reservation_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({reservation.booking_date || new Date(reservation.reservation_time).toLocaleDateString('vi-VN')})
                        </span>
                      </div>

                      {reservation.guest_count > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-[#6B625B]">Số lượng khách:</span>
                          <span className="font-bold text-[#543310]">
                            {reservation.guest_count} người
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center border-t border-[#E8DED5] pt-2">
                        <span className="text-xs text-[#6B625B]">Tiền cọc quy định:</span>
                        <span className="font-extrabold text-base text-[#D67D3E]">
                          {Number(reservation.deposit_amount || 50000).toLocaleString('vi-VN')}đ
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#6B625B]">Trạng thái cọc:</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm ${reservation.status === 'PAID' ? 'bg-green-100 text-green-800 border border-green-300' :
                            reservation.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}>
                          {reservation.status === 'PAID' ? '✓ Đã nhận tiền cọc' : reservation.status === 'PENDING' ? '⏳ Chờ xác nhận cọc' : reservation.status}
                        </span>
                      </div>

                      {/* RESERVATION ACTIONS */}
                      <div className="mt-4 space-y-2 border-t border-[#E8DED5] pt-3">
                        {reservation.status === 'PENDING' && (
                          <button
                            onClick={async () => {
                              const resCode = reservation.reservation_code;
                              if (resCode) {
                                try {
                                  await apiClient.post(`/reservations/${resCode}/confirm-deposit`);
                                  setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, status: 'RESERVED' } : t));
                                  setSelectedTable({ ...selectedTable, status: 'RESERVED' as any });
                                  setActiveReservations(prev => prev.map(r => r.reservation_code === resCode ? { ...r, status: 'PAID' } : r));
                                  showAlert('Đã xác nhận cọc thành công! Khách hàng sẽ nhận được thông báo.', 'success', 'Xác Nhận Cọc');
                                } catch (e: any) {
                                  console.error(e);
                                  showAlert(e.response?.data?.message || 'Không thể xác nhận cọc lúc này', 'error', 'Lỗi Xác Nhận');
                                }
                              }
                            }}
                            className="w-full bg-[#115E59] text-white py-2 rounded-lg font-bold shadow-sm hover:bg-green-700 transition text-sm"
                          >
                            Xác nhận đã nhận tiền cọc
                          </button>
                        )}

                        {reservation.status === 'PAID' && (
                          <button
                            onClick={async () => {
                              const resCode = reservation.reservation_code;
                              if (resCode) {
                                try {
                                  await apiClient.post(`/reservations/${resCode}/check-in`);
                                  setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, status: 'OCCUPIED' } : t));
                                  setSelectedTable({ ...selectedTable, status: 'OCCUPIED' as any });
                                  setActiveReservations(prev => prev.filter(r => r.reservation_code !== resCode));
                                } catch (e: any) {
                                  console.error(e);
                                  showAlert(e.response?.data?.message || 'Không thể nhận bàn lúc này', 'error', 'Lỗi Cập Nhật');
                                }
                              }
                            }}
                            className="w-full bg-[#D67D3E] text-white py-2 rounded-lg font-bold shadow-sm hover:bg-orange-700 transition text-sm"
                          >
                            Khách đã tới (Check-in)
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenCancelModalForTable(selectedTable, reservation.reservation_code)}
                          className="w-full bg-red-50 text-red-700 py-2 rounded-lg font-bold shadow-sm hover:bg-red-100 transition border border-red-200 text-sm"
                        >
                          Hủy bàn cọc / Báo ảo
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 flex-1 mt-4">
              <h3 className="text-sm font-bold text-[#543310] uppercase tracking-wider mb-2">Hành động cho bàn</h3>

              {selectedTable.status === 'AVAILABLE' && (
                <button
                  onClick={() => handleStatusChange('OCCUPIED')}
                  className="w-full bg-[#D67D3E] text-white py-2.5 rounded-lg font-bold shadow-sm hover:bg-orange-700 transition"
                >
                  Mở bàn (Cho khách vãng lai)
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

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate(`/pos?floor_id=${selectedFloor}&table_id=${selectedTable.id}`)}
                  className="flex-1 border-2 border-[#543310] text-[#543310] py-2.5 rounded-lg font-bold hover:bg-orange-50 transition text-sm"
                >
                  {activeOrder ? 'Order Thêm (POS)' : 'Tạo Đơn (POS)'}
                </button>
                {activeOrder && selectedTable.status === 'OCCUPIED' && (
                  <button
                    onClick={() => {
                      const orderAmount = Number(activeOrder?.final_amount || activeOrder?.total_amount || 0);
                      navigate(`/pos?floor_id=${selectedFloor}&table_id=${selectedTable.id}&action=pay&order_id=${activeOrder.id}&amount=${orderAmount}`);
                    }}
                    className="flex-1 bg-[#237A57] text-white py-2.5 rounded-lg font-bold hover:bg-green-700 transition shadow-sm text-sm"
                  >
                    Thanh toán
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-lg font-bold text-[#543310]">Hủy Giữ Bàn / Bàn Cọc</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Nhập lý do hủy cho mã đặt bàn <strong className="text-[#543310] font-mono">{cancelingTarget?.resCode}</strong>. Lý do này sẽ được thông báo trực tiếp tới phía khách hàng.
            </p>

            <div className="space-y-2 mb-4">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Lý do chọn nhanh:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Khách gọi xin hủy bàn',
                  'Quá hạn chưa nhận chuyển khoản cọc',
                  'Khách báo thông tin ảo',
                  'Nhà hàng đã hết bàn phục vụ',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCancelReason(preset)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium border transition ${cancelReason === preset ? 'bg-[#543310] text-white border-[#543310]' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">Nội dung lý do hủy:</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy gửi khách..."
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#D67D3E] focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition"
              >
                Đóng
              </button>
              <button
                onClick={handleExecuteCancel}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-md"
              >
                Xác nhận Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      <StaffPhoneBookingModal
        isOpen={showStaffBookingModal}
        onClose={() => setShowStaffBookingModal(false)}
        tables={tables}
        selectedTableId={selectedTable?.id}
        onSuccess={(res) => {
          showAlert(`Đã tạo giữ bàn cọc cho ${res.customer_name || 'khách hàng'} thành công! Mã: ${res.reservation_code || res.code}`, 'success', 'Đặt Bàn');
          const targetStatus = (res.table_status || (res.status === 'PAID' ? 'RESERVED' : 'PENDING_LOCK')) as any;
          const targetTableId = res.table_id;
          setTables(prev => prev.map(t => t.id === targetTableId ? { ...t, status: targetStatus, reservation_code: res.reservation_code } : t));

          if (selectedTable && selectedTable.id === targetTableId) {
            setSelectedTable((prev: any) => prev ? { ...prev, status: targetStatus, reservation_code: res.reservation_code } : null);
          }

          let resTime = new Date().toISOString();
          if (res.booking_date && res.booking_time) {
            resTime = new Date(`${res.booking_date}T${res.booking_time}:00`).toISOString();
          } else if (res.reservation_time) {
            resTime = res.reservation_time;
          }
          
          // Show immediately if it's an upcoming active reservation
          setActiveReservations(prev => [...prev, {
            reservation_code: res.reservation_code,
            customer_name: res.customer_name,
            customer_phone: res.customer_phone,
            deposit_amount: res.deposit_amount,
            status: res.status,
            guest_count: res.guest_count,
            booking_date: res.booking_date,
            booking_time: res.booking_time,
            reservation_time: resTime
          }]);

          if (selectedFloor) {
            fetchTables(selectedFloor);
          }
        }}
      />
    </div>
  );
};

export default LiveFloorMap;
