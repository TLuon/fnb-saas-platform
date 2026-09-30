import React, { useCallback, useEffect, useState } from 'react';
import { RealtimeClient, apiClient, authStore } from '@fnb/utils';
import { useStore } from 'zustand';
import { getSocketBaseUrl, mapKdsSnapshot } from '../lib/kds';
import { useModal } from './ModalProvider';

export interface OrderItem {
  id: string;
  orderId: string;
  orderCode?: string;
  name: string;
  quantity: number;
  kitchen_status: 'QUEUED' | 'PREPARING' | 'READY' | 'SERVED';
  createdAt: number;
  station: 'KITCHEN' | 'BAR';
  orderType?: 'DINE_IN' | 'TAKEAWAY';
  tableName?: string;
  note?: string;
  modifiers?: Record<string, string>;
}

interface ColumnProps {
  title: string;
  status: OrderItem['kitchen_status'];
  items: OrderItem[];
  now: number;
  lateThresholdMins: number;
  changeStatus: (orderId: string, itemId: string, newStatus: OrderItem['kitchen_status']) => void;
  pendingActions: Set<string>;
  isReadOnly?: boolean;
}

const Column: React.FC<ColumnProps> = ({ title, status, items, now, lateThresholdMins, changeStatus, pendingActions, isReadOnly }) => (
  <div className="flex-1 flex flex-col bg-white border border-[#E8DED5] rounded-xl p-4 shadow-sm min-h-[500px]">
    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
      <h3 className="text-lg font-bold text-[#543310]">{title}</h3>
      <span className="bg-gray-100 text-[#543310] px-3 py-1 rounded-full text-sm font-bold border border-gray-200">
        {items.filter(i => i.kitchen_status === status).length}
      </span>
    </div>
    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
      {items
        .filter((i) => i.kitchen_status === status)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((item) => {
          const elapsedMins = Math.floor((now - item.createdAt) / 60000);
          const isLate = elapsedMins > lateThresholdMins;
          const isPending = pendingActions.has(item.id);
          
          return (
            <div
              key={item.id}
              className={`p-4 rounded-md border-2 flex flex-col gap-3 transition shadow-sm ${isLate ? 'bg-red-50 border-red-200' : status === 'QUEUED' ? 'bg-[#FAF7F3] border-[#D67D3E]' : 'bg-[#FAF7F3] border-[#E8DED5]'} ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg text-[#543310]">#{item.orderCode || (item.orderId ? 'ORD-' + item.orderId.slice(0, 6).toUpperCase() : '')}</span>
                    {item.orderType === 'TAKEAWAY' ? (
                      <span className="bg-[#D67D3E] text-white text-xs font-bold px-2 py-0.5 rounded uppercase">Mang đi</span>
                    ) : item.tableName ? (
                      <span className="bg-[#E8DED5] text-[#543310] text-xs font-bold px-2 py-0.5 rounded">{item.tableName}</span>
                    ) : null}
                  </div>
                  <p className="font-bold text-[#D67D3E] text-lg">{item.quantity}x {item.name}</p>
                  
                  {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                    <p className="text-xs text-gray-500 font-bold mt-1">
                      {Object.values(item.modifiers).join(', ')}
                    </p>
                  )}
                  {item.note && (
                    <p className="text-xs text-[#D67D3E] font-black mt-1 italic">
                      Ghi chú: {item.note}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${isLate ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-600 border'}`}>
                  {elapsedMins} phút
                </span>
              </div>
              
              <div className="mt-2 flex gap-2">
                {isReadOnly ? (
                  <div className="flex-1 text-center py-1.5 px-2 bg-gray-100 text-gray-500 rounded text-xs font-bold border border-gray-200">
                    Chỉ xem tiến trình (Read-Only)
                  </div>
                ) : (
                  <>
                    {status === 'QUEUED' && (
                      <button
                        onClick={() => changeStatus(item.orderId, item.id, 'PREPARING')}
                        disabled={isPending}
                        className="flex-1 text-sm bg-[#D67D3E] text-white py-2 rounded-md font-bold shadow-sm hover:bg-orange-700 transition"
                      >
                        Bắt đầu làm
                      </button>
                    )}
                    {status === 'PREPARING' && (
                      <button
                        onClick={() => changeStatus(item.orderId, item.id, 'READY')}
                        disabled={isPending}
                        className="flex-1 text-sm bg-[#237A57] text-white py-2 rounded-md font-bold shadow-sm hover:bg-green-700 transition"
                      >
                        Đã chuẩn bị xong
                      </button>
                    )}
                    {status === 'READY' && (
                      <button
                        onClick={() => changeStatus(item.orderId, item.id, 'SERVED')}
                        disabled={isPending}
                        className="flex-1 text-sm bg-gray-200 text-gray-800 py-2 rounded-md font-bold shadow-sm hover:bg-gray-300 transition"
                      >
                        Đã sẵn sàng & báo POS
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
    </div>
  </div>
);

export interface KDSBoardProps {
  station: 'KITCHEN' | 'BAR';
  title: string;
  description: string;
  lateThresholdMins: number;
}

export const KDSBoard: React.FC<KDSBoardProps> = ({ station, title, description, lateThresholdMins }) => {
  const { showAlert } = useModal();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [now, setNow] = useState(Date.now());
  const [isConnected, setIsConnected] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState('');
  const branchId = useStore(authStore, (state) => state.branchId);
  const accessToken = useStore(authStore, (state) => state.accessToken);
  const profile = useStore(authStore, (state) => state.profile);
  const userEmail = profile?.email || '';

  const isReadOnly = React.useMemo(() => {
    if (profile?.role_app === 'OWNER') return false;
    if (userEmail.toLowerCase().includes('bep')) return station !== 'KITCHEN';
    if (userEmail.toLowerCase().includes('bar')) return station !== 'BAR';
    return true; // Cashier Staff (staff.runtime@example.com) is Read-Only!
  }, [profile, userEmail, station]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchSnapshot = useCallback(() => {
    if (!branchId) {
      setItems([]);
      setLoadError('Tài khoản chưa được gán chi nhánh');
      return;
    }
    apiClient.get(`/orders/kds?branch_id=${branchId}&station=${station}`)
      .then((res: any) => {
        const fetchedItems = mapKdsSnapshot(res.data?.data || res.data || res || [], station);
        setItems(fetchedItems);
        setLoadError('');
      })
      .catch((error: any) => {
        console.error('KDS snapshot error:', error);
        setLoadError(error?.message || 'Không thể tải danh sách món');
      });
  }, [branchId, station]);

  useEffect(() => {
    if (!branchId || !accessToken) return;

    fetchSnapshot();

    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    const socketUrl = import.meta.env.VITE_SOCKET_URL || getSocketBaseUrl(apiUrl);
    const client = new RealtimeClient({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      socketUrl,
      token: accessToken,
    });

    client.socket.on('connect', () => {
      setIsConnected(true);
      client.socket.emit('join_branch', { branch_id: branchId });
      fetchSnapshot();
    });
    
    client.socket.on('disconnect', () => setIsConnected(false));

    client.socket.on('kds_new_ticket', (ticket: any) => {
      if (ticket.station && ticket.station !== station) return;
      const createdAt = ticket.createdAt ? new Date(ticket.createdAt).getTime() : Date.now();
      const newItems = (ticket.items || [])
        .filter((i: any) => i.station === station || !i.station)
        .map((item: any) => ({
          id: item.order_item_id || item.id || crypto.randomUUID(),
          orderId: ticket.order_id || ticket.orderId || '',
          orderCode: ticket.order_code || ticket.orderCode || (ticket.order_id ? 'ORD-' + ticket.order_id.slice(0, 6).toUpperCase() : ''),
          name: item.product_name || item.name || 'Món',
          quantity: item.quantity,
          kitchen_status: item.kitchen_status || 'QUEUED',
          createdAt,
          station,
          orderType: ticket.type || ticket.order_type || 'DINE_IN',
          tableName: ticket.table_name || ticket.tableName || '',
          note: item.note,
          modifiers: item.modifiers
        }));
        
      setItems(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const toAdd = newItems.filter((item: any) => !existingIds.has(item.id));
        return [...prev, ...toAdd];
      });
    });

    client.socket.on('kds_item_status_changed', (data: any) => {
      const targetId = data.order_item_id || data.itemId;
      setItems((prev) => prev.map(item => 
        item.id === targetId ? { ...item, kitchen_status: data.kitchen_status } : item
      ));
    });

    client.connect();

    const snapshotInterval = window.setInterval(fetchSnapshot, 10000);

    return () => {
      window.clearInterval(snapshotInterval);
      client.disconnect();
    };
  }, [accessToken, branchId, fetchSnapshot, station]);

  const changeStatus = async (orderId: string, itemId: string, newStatus: OrderItem['kitchen_status']) => {
    if (isReadOnly) return;
    const originalItem = items.find(i => i.id === itemId);
    if (!originalItem) return;
    const oldStatus = originalItem.kitchen_status;

    // Optimistic UI update
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, kitchen_status: newStatus } : item)));
    setPendingActions(prev => new Set(prev).add(itemId));
    
    try {
      await apiClient.patch(`/orders/${orderId}/items/${itemId}/kitchen-status`, { kitchen_status: newStatus });
    } catch (e) {
      // Revert on failure
      setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, kitchen_status: oldStatus } : item)));
      showAlert('Không thể cập nhật trạng thái món ăn lúc này', 'error', 'Lỗi Cập Nhật');
    } finally {
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F3] p-6">
      <header className="mb-6 flex justify-between items-end border-b border-[#E8DED5] pb-4">
        <div>
          <h1 className="text-3xl font-black text-[#543310] flex items-center gap-3">
            {title}
            {isReadOnly && (
              <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full font-bold">
                👁️ Màn hình theo dõi tiến trình (Read-Only)
              </span>
            )}
          </h1>
          <p className="text-gray-500 font-medium mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-[#543310] font-bold text-xl tracking-wider">
            {new Date(now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-bold shadow-sm ${isConnected ? 'bg-[#237A57]' : 'bg-[#B42318]'}`}>
            <div className={`w-2.5 h-2.5 rounded-full bg-white ${isConnected ? 'animate-pulse' : ''}`}></div>
            {isConnected ? 'Socket Connected' : 'Offline'}
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-2">
        {loadError && (
          <div className="absolute left-1/2 -translate-x-1/2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
            {loadError}
          </div>
        )}
        <div className="min-w-[320px] flex-1">
          <Column title="Chờ chế biến (QUEUED)" status="QUEUED" items={items} now={now} lateThresholdMins={lateThresholdMins} changeStatus={changeStatus} pendingActions={pendingActions} isReadOnly={isReadOnly} />
        </div>
        <div className="min-w-[320px] flex-1">
          <Column title="Đang làm (PREPARING)" status="PREPARING" items={items} now={now} lateThresholdMins={lateThresholdMins} changeStatus={changeStatus} pendingActions={pendingActions} isReadOnly={isReadOnly} />
        </div>
        <div className="min-w-[320px] flex-1">
          <Column title="Sẵn sàng (READY)" status="READY" items={items} now={now} lateThresholdMins={lateThresholdMins} changeStatus={changeStatus} pendingActions={pendingActions} isReadOnly={isReadOnly} />
        </div>
        <div className="min-w-[320px] flex-1 opacity-60">
          <Column title="Đã phục vụ (SERVED)" status="SERVED" items={items} now={now} lateThresholdMins={lateThresholdMins} changeStatus={changeStatus} pendingActions={pendingActions} isReadOnly={isReadOnly} />
        </div>
      </div>
    </div>
  );
};

