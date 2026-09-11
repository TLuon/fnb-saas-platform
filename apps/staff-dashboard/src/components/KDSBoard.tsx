import React, { useEffect, useState, useMemo } from 'react';
import { RealtimeClient, createApiClient } from '@fnb/utils';

export interface OrderItem {
  id: string;
  orderId: string;
  name: string;
  quantity: number;
  kitchen_status: 'QUEUED' | 'PREPARING' | 'READY' | 'SERVED';
  createdAt: number;
  station: 'KITCHEN' | 'BAR';
}

interface ColumnProps {
  title: string;
  status: OrderItem['kitchen_status'];
  items: OrderItem[];
  now: number;
  lateThresholdMins: number;
  changeStatus: (orderId: string, itemId: string, newStatus: OrderItem['kitchen_status']) => void;
  pendingActions: Set<string>;
}

const Column: React.FC<ColumnProps> = ({ title, status, items, now, lateThresholdMins, changeStatus, pendingActions }) => (
  <div className="flex-1 flex flex-col bg-white border border-[#E8DED5] rounded-xl p-4 shadow-sm min-h-[500px]">
    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
      <h3 className="text-lg font-bold text-[#543310]">{title}</h3>
      <span className="bg-gray-100 text-[#543310] px-3 py-1 rounded-full text-sm font-bold border border-gray-200">
        {items.filter(i => i.kitchen_status === status).length}
      </span>
    </div>
    <div className="space-y-3 flex-1 overflow-y-auto pr-1 hide-scrollbar">
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
              className={`p-4 rounded-md border flex flex-col gap-3 transition shadow-sm ${isLate ? 'bg-red-50 border-red-200' : 'bg-[#FAF7F3] border-[#E8DED5]'} ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-lg text-[#543310]">#{item.orderId.slice(0, 5)}</span>
                  <p className="text-sm font-bold text-[#D67D3E] mt-1 text-lg">{item.quantity}x {item.name}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${isLate ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-600 border'}`}>
                  {elapsedMins} phút
                </span>
              </div>
              <div className="mt-2 flex gap-2">
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
                    Hoàn thành
                  </button>
                )}
                {status === 'READY' && (
                  <button
                    onClick={() => changeStatus(item.orderId, item.id, 'SERVED')}
                    disabled={isPending}
                    className="flex-1 text-sm bg-gray-200 text-gray-800 py-2 rounded-md font-bold shadow-sm hover:bg-gray-300 transition"
                  >
                    Đã giao (Served)
                  </button>
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
  const [items, setItems] = useState<OrderItem[]>([]);
  const [now, setNow] = useState(Date.now());
  const [isConnected, setIsConnected] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  const branchId = localStorage.getItem('branchId') || 'branch-1';

  const apiClient = useMemo(() => createApiClient({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    getToken: () => localStorage.getItem('jwt'),
  }), []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch initial snapshot
    apiClient.get(`/api/v1/orders/kds?branch_id=${branchId}&station=${station}`)
      .then(res => {
        const fetchedItems = (res.data.data || []).map((item: any) => ({
          id: item.id,
          orderId: item.order_id,
          name: item.product_name,
          quantity: item.quantity,
          kitchen_status: item.kitchen_status || 'QUEUED',
          createdAt: new Date(item.created_at || Date.now()).getTime(),
          station: item.station || station
        }));
        setItems(fetchedItems);
      })
      .catch(console.error);

    const token = localStorage.getItem('jwt');
    const client = new RealtimeClient({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      socketUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      token: token || undefined,
    });

    client.socket.on('connect', () => {
      setIsConnected(true);
      client.socket.emit('join_branch', { branch_id: branchId });
    });
    
    client.socket.on('disconnect', () => setIsConnected(false));

    client.socket.on('kds_new_ticket', (ticket: any) => {
      const createdAt = ticket.createdAt ? new Date(ticket.createdAt).getTime() : Date.now();
      const newItems = (ticket.items || [])
        .filter((i: any) => i.station === station || !i.station)
        .map((item: any) => ({
          id: item.order_item_id || item.id || Math.random().toString(36).substr(2, 9),
          orderId: ticket.order_id || ticket.orderId || '',
          name: item.product_name || item.name || 'Món',
          quantity: item.quantity,
          kitchen_status: item.kitchen_status || 'QUEUED',
          createdAt,
          station
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

    return () => {
      client.disconnect();
    };
  }, [apiClient, branchId, station]);

  const changeStatus = async (orderId: string, itemId: string, newStatus: OrderItem['kitchen_status']) => {
    const originalItem = items.find(i => i.id === itemId);
    if (!originalItem) return;
    const oldStatus = originalItem.kitchen_status;

    // Optimistic UI update
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, kitchen_status: newStatus } : item)));
    setPendingActions(prev => new Set(prev).add(itemId));
    
    try {
      await apiClient.patch(`/api/v1/orders/${orderId}/items/${itemId}/kitchen-status`, { kitchen_status: newStatus });
    } catch (e) {
      // Revert on failure
      setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, kitchen_status: oldStatus } : item)));
      alert('Không thể cập nhật trạng thái');
    } finally {
      setPendingActions(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FAF7F3] p-6">
      <header className="mb-6 flex justify-between items-end border-b border-[#E8DED5] pb-4">
        <div>
          <h1 className="text-3xl font-black text-[#543310]">{title}</h1>
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

      <div className="flex-1 flex gap-6 overflow-hidden">
        <Column title="Chờ chế biến (QUEUED)" status="QUEUED" items={items} now={now} lateThresholdMins={lateThresholdMins} changeStatus={changeStatus} pendingActions={pendingActions} />
        <Column title="Đang làm (PREPARING)" status="PREPARING" items={items} now={now} lateThresholdMins={lateThresholdMins} changeStatus={changeStatus} pendingActions={pendingActions} />
        <Column title="Sẵn sàng (READY)" status="READY" items={items} now={now} lateThresholdMins={lateThresholdMins} changeStatus={changeStatus} pendingActions={pendingActions} />
      </div>
    </div>
  );
};
