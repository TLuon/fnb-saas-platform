import { useEffect, useState } from 'react';
import { RealtimeClient } from '@fnb/utils';

export interface Order {
  id: string;
  items: Array<{ name: string; quantity: number }>;
  status: 'PENDING' | 'PREPARING' | 'READY';
  createdAt: number;
}

const Column = ({ title, status, orders, now, changeStatus, markOutOfStock }: { 
  title: string; 
  status: Order['status'];
  orders: Order[];
  now: number;
  changeStatus: (id: string, newStatus: Order['status']) => void;
  markOutOfStock: (id: string) => void;
}) => (
  <div className="flex-1 flex flex-col bg-gray-50 rounded-2xl p-4 min-h-[500px]">
    <h3 className="text-xl font-bold font-serif mb-4 text-[var(--color-brand-primary)]">
      {title}
    </h3>
    <div className="space-y-3 flex-1 overflow-y-auto" data-testid={`column-${status}`}>
      {orders
        .filter((o) => o.status === status)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((order) => {
          const elapsedMins = Math.floor((now - order.createdAt) / 60000);
          const isLate = elapsedMins > 15;
          return (
            <div
              key={order.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2 transition hover:shadow-md"
              data-testid={`order-${order.id}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-gray-800">#{order.id.slice(0, 5)}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isLate ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                  {elapsedMins} phút
                </span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span><span className="font-bold text-[var(--color-brand-accent)]">{item.quantity}x</span> {item.name}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2 justify-end">
                {status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => markOutOfStock(order.id)}
                      className="text-xs bg-red-50 text-red-500 px-3 py-2 rounded-lg font-bold hover:bg-red-100 transition"
                    >
                      Báo hết món
                    </button>
                    <button
                      onClick={() => changeStatus(order.id, 'PREPARING')}
                      className="text-xs bg-[var(--color-brand-secondary)] text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 transition flex-1"
                    >
                      Bắt đầu làm
                    </button>
                  </>
                )}
                {status === 'PREPARING' && (
                  <button
                    onClick={() => changeStatus(order.id, 'READY')}
                    className="text-xs bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:opacity-90 transition flex-1"
                  >
                    Hoàn thành món
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Timer for Elapsed Time
    const interval = setInterval(() => setNow(Date.now()), 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const client = new RealtimeClient({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321',
      supabaseKey: import.meta.env.VITE_SUPABASE_KEY || 'dummy-key',
      socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001',
    });

    client.connect();

    client.socket.on('new_order', (orderData: any) => {
      setOrders((prev) => [
        ...prev,
        {
          id: orderData.orderId || orderData.id || Math.random().toString(36).substr(2, 9),
          items: orderData.items || [],
          status: 'PENDING',
          createdAt: orderData.createdAt ? new Date(orderData.createdAt).getTime() : Date.now(),
        },
      ]);
    });

    return () => {
      client.socket.off('new_order');
      client.disconnect();
    };
  }, []);

  const changeStatus = async (id: string, newStatus: Order['status']) => {
    const originalOrder = orders.find(o => o.id === id);
    if (!originalOrder) return;
    const oldStatus = originalOrder.status;

    // Optimistic UI Update
    setOrders((prev) =>
      prev.map((order) => (order.id === id ? { ...order, status: newStatus } : order))
    );
    
    try {
      // Mock API call to PATCH /orders/:orderId/status
      const res = await fetch(`http://localhost:3001/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('API failed');
    } catch (e) {
      console.warn("API call failed, rolling back optimistic update");
      setOrders((prev) =>
        prev.map((order) => (order.id === id ? { ...order, status: oldStatus } : order))
      );
    }
  };

  const markOutOfStock = async (id: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== id));
    // Implementation to call API to cancel order / items...
  };


  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">KDS (Bếp)</h2>
        <p className="text-gray-500 mt-2">Màn hình điều phối chế biến (Kanban)</p>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden pb-4">
        <Column title="Chờ chế biến" status="PENDING" orders={orders} now={now} changeStatus={changeStatus} markOutOfStock={markOutOfStock} />
        <Column title="Đang làm" status="PREPARING" orders={orders} now={now} changeStatus={changeStatus} markOutOfStock={markOutOfStock} />
        <Column title="Hoàn thành" status="READY" orders={orders} now={now} changeStatus={changeStatus} markOutOfStock={markOutOfStock} />
      </div>
    </div>
  );
}
