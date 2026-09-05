import { useEffect, useState } from 'react';
import { RealtimeClient } from '@fnb/utils';
import { useAuthStore } from '../store/authStore';

export interface OrderItem {
  id: string;
  orderId: string;
  name: string;
  quantity: number;
  kitchen_status: 'QUEUED' | 'PREPARING' | 'READY' | 'SERVED';
  createdAt: number;
}

const Column = ({ title, status, items, now, changeStatus, markOutOfStock }: { 
  title: string; 
  status: OrderItem['kitchen_status'];
  items: OrderItem[];
  now: number;
  changeStatus: (orderId: string, itemId: string, newStatus: OrderItem['kitchen_status']) => void;
  markOutOfStock: (orderId: string, itemId: string) => void;
}) => (
  <div className="flex-1 flex flex-col bg-gray-50 rounded-2xl p-4 min-h-[500px]">
    <h3 className="text-xl font-bold font-serif mb-4 text-[var(--color-brand-primary)]">
      {title}
    </h3>
    <div className="space-y-3 flex-1 overflow-y-auto" data-testid={`column-${status}`}>
      {items
        .filter((i) => i.kitchen_status === status)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((item) => {
          const elapsedMins = Math.floor((now - item.createdAt) / 60000);
          const isLate = elapsedMins > 15;
          return (
            <div
              key={item.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2 transition hover:shadow-md"
              data-testid={`item-${item.id}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-gray-800">#{item.orderId.slice(0, 5)}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isLate ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                  {elapsedMins} phút
                </span>
              </div>
              <div className="text-sm text-gray-800 flex justify-between">
                <span><span className="font-bold text-[var(--color-brand-accent)]">{item.quantity}x</span> {item.name}</span>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                {status === 'QUEUED' && (
                  <>
                    <button
                      onClick={() => markOutOfStock(item.orderId, item.id)}
                      className="text-xs bg-red-50 text-red-500 px-3 py-2 rounded-lg font-bold hover:bg-red-100 transition"
                    >
                      Báo hết món
                    </button>
                    <button
                      onClick={() => changeStatus(item.orderId, item.id, 'PREPARING')}
                      className="text-xs bg-[var(--color-brand-secondary)] text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 transition flex-1"
                    >
                      Bắt đầu làm
                    </button>
                  </>
                )}
                {status === 'PREPARING' && (
                  <button
                    onClick={() => changeStatus(item.orderId, item.id, 'READY')}
                    className="text-xs bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 transition flex-1"
                  >
                    Hoàn thành
                  </button>
                )}
              </div>
            </div>
          );
        })}
    </div>
  </div>
);

export default function KDS() {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [now, setNow] = useState(Date.now());
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    // Timer for Elapsed Time
    const interval = setInterval(() => setNow(Date.now()), 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const client = new RealtimeClient({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321',
      supabaseKey: import.meta.env.VITE_SUPABASE_KEY || 'dummy-key',
      socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
    });

    client.connect();

    client.socket.on('kds_new_ticket', (ticket: any) => {
      const createdAt = ticket.createdAt ? new Date(ticket.createdAt).getTime() : Date.now();
      const newItems = (ticket.items || []).map((item: any) => ({
        id: item.id || Math.random().toString(36).substr(2, 9),
        orderId: ticket.orderId,
        name: item.name,
        quantity: item.quantity,
        kitchen_status: item.kitchen_status || 'QUEUED',
        createdAt
      }));
      setItems((prev) => [...prev, ...newItems]);
    });

    client.socket.on('kds_item_status_changed', (data: any) => {
      setItems((prev) => prev.map(item => 
        item.id === data.itemId ? { ...item, kitchen_status: data.kitchen_status } : item
      ));
    });

    return () => {
      client.socket.off('kds_new_ticket');
      client.socket.off('kds_item_status_changed');
      client.disconnect();
    };
  }, []);

  const changeStatus = async (orderId: string, itemId: string, newStatus: OrderItem['kitchen_status']) => {
    const originalItem = items.find(i => i.id === itemId);
    if (!originalItem) return;
    const oldStatus = originalItem.kitchen_status;

    // Optimistic UI Update
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, kitchen_status: newStatus } : item))
    );
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/orders/${orderId}/items/${itemId}/kitchen-status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ kitchen_status: newStatus }),
      });
      if (!res.ok) throw new Error('API failed');
    } catch (e) {
      console.warn("API call failed, rolling back optimistic update");
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, kitchen_status: oldStatus } : item))
      );
    }
  };

  const markOutOfStock = async (_orderId: string, itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    // Implementation to call API to cancel order item...
  };


  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">KDS (Bếp)</h2>
        <p className="text-gray-500 mt-2">Màn hình điều phối chế biến (Kanban)</p>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden pb-4">
        <Column title="Chờ chế biến (QUEUED)" status="QUEUED" items={items} now={now} changeStatus={changeStatus} markOutOfStock={markOutOfStock} />
        <Column title="Đang làm (PREPARING)" status="PREPARING" items={items} now={now} changeStatus={changeStatus} markOutOfStock={markOutOfStock} />
        <Column title="Hoàn thành (READY)" status="READY" items={items} now={now} changeStatus={changeStatus} markOutOfStock={markOutOfStock} />
      </div>
    </div>
  );
}
