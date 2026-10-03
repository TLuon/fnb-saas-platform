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
        const [ordersRes, reservationsRes] = await Promise.all([
          apiClient.get(`/orders?page=1&limit=20`).catch(() => null),
          apiClient.get(`/reservations/my`).catch(() => null)
        ]);
        
        const ordersData = (Array.isArray(ordersRes) ? ordersRes : (ordersRes?.data?.data || ordersRes?.data || [])).map((o: any) => ({...o, itemType: 'order'}));
        const resData = (Array.isArray(reservationsRes) ? reservationsRes : (reservationsRes?.data?.data || reservationsRes?.data || [])).map((r: any) => ({...r, itemType: 'reservation'}));
        
        const combined = [...ordersData, ...resData].sort((a, b) => new Date(b.created_at || b.reservation_time || 0).getTime() - new Date(a.created_at || a.reservation_time || 0).getTime());
        setOrders(combined);
      } catch (err) {
        console.error('Failed to fetch history', err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(o => {
    const status = (o.status || '').toUpperCase();
    if (filter === 'ACTIVE') {
      if (o.itemType === 'reservation') return ['PENDING', 'PAID', 'PENDING_LOCK'].includes(status);
      return ['PENDING', 'IN_PROGRESS', 'PREPARING', 'READY', 'SERVED', 'PROCESSING'].includes(status);
    }
    if (filter === 'COMPLETED') {
      if (o.itemType === 'reservation') return status === 'COMPLETED' || status === 'CHECKED_IN';
      return status === 'COMPLETED' || status === 'DELIVERED';
    }
    if (filter === 'CANCELLED') {
      return status === 'CANCELLED' || status === 'EXPIRED' || status === 'REJECTED';
    }
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
