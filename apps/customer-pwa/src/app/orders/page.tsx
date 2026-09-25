'use client';

import React, { useEffect, useState } from 'react';
import { PublicHeader } from '../../components/PublicHeader';
import { OrderFilterTabs, OrderFilter } from '../../components/orders/OrderFilterTabs';
import { OrderListItem } from '../../components/orders/OrderListItem';
import { apiClient } from '@fnb/utils';

export default function OrdersPage() {
  const [filter, setFilter] = useState<OrderFilter>('ACTIVE');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res: any = await apiClient.get(`/orders?page=1&limit=20`);
        const data = res?.data || res;
        setOrders(Array.isArray(data) ? data : (data?.data || []));
      } catch (err) {
        console.error('Failed to fetch orders', err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(o => {
    if (filter === 'ACTIVE') return ['PENDING', 'PREPARING', 'READY', 'SERVED'].includes(o.status);
    if (filter === 'COMPLETED') return o.status === 'COMPLETED';
    if (filter === 'CANCELLED') return o.status === 'CANCELLED';
    return true;
  });

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col pb-24">
      <PublicHeader />
      
      <div className="max-w-screen-xl mx-auto w-full p-4">
        <h1 className="text-2xl font-bold font-serif text-[#543310] mb-6">Đơn hàng của tôi</h1>
        
        <OrderFilterTabs filter={filter} onChange={setFilter} />

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#543310]"></div>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div>
            {filteredOrders.map(order => (
              <OrderListItem key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-xl border border-[#E8DED5] text-center mt-4 shadow-sm">
            <p className="text-[#6B625B] font-bold">Không có đơn hàng nào.</p>
          </div>
        )}
      </div>
    </main>
  );
}
