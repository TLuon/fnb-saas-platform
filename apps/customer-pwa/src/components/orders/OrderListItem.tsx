import React from 'react';
import Link from 'next/link';
import { ChevronRight, Store, ShoppingBag } from 'lucide-react';

interface OrderListItemProps {
  order: any;
}

export function OrderListItem({ order }: OrderListItemProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'PREPARING':
        return <span className="px-2 py-1 bg-[#FED8B1] text-[#D67D3E] text-xs font-bold rounded-full">Đang xử lý</span>;
      case 'COMPLETED':
        return <span className="px-2 py-1 bg-[#E2F3E5] text-[#237A57] text-xs font-bold rounded-full">Hoàn thành</span>;
      case 'CANCELLED':
        return <span className="px-2 py-1 bg-[#FEE4E2] text-[#B42318] text-xs font-bold rounded-full">Đã hủy</span>;
      default:
        return <span className="px-2 py-1 bg-[#E8DED5] text-[#6B625B] text-xs font-bold rounded-full">{status}</span>;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const isDineIn = order.order_type === 'DINE_IN';

  const items = order.order_items || order.items || [];
  const displayAmount = Number(order.final_amount || order.total_amount || order.subtotal || 0);

  return (
    <Link href={`/orders/${order.id}`} className="block bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-[#E8DED5] mb-4 hover:border-[#D67D3E] transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-[#543310] text-sm uppercase">#{order.order_code || order.order_number || ('ORD-' + order.id?.slice(0, 6).toUpperCase())}</h3>
          <p className="text-xs text-[#6B625B] mt-1">{new Date(order.created_at).toLocaleString('vi-VN')}</p>
        </div>
        {getStatusBadge(order.status)}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="px-3 py-1.5 bg-[#FAF7F3] rounded-lg text-xs font-bold text-[#6B625B] flex items-center gap-1.5">
          {isDineIn ? <Store size={14} /> : <ShoppingBag size={14} />}
          {isDineIn ? (order.tables?.table_code || order.table_name ? `Bàn ${order.tables?.table_code || order.table_name}` : 'Tại bàn') : 'Mang đi'}
        </div>
      </div>

      {items.length > 0 && (
        <div className="text-xs font-medium text-gray-700 bg-[#FAF7F3]/70 p-2.5 rounded-lg border border-gray-100 mb-3 truncate">
          {items.map((it: any) => `${it.quantity || 1}x ${it.product_name || it.name || 'Món'}`).join(', ')}
        </div>
      )}

      <div className="flex justify-between items-center border-t border-[#E8DED5] pt-3">
        <div>
          <span className="text-xs text-[#6B625B]">Tổng tiền</span>
          <p className="font-bold text-[#543310]">{formatPrice(displayAmount)}</p>
        </div>
        <div className="flex items-center gap-1 text-[#D67D3E] text-sm font-bold">
          Chi tiết <ChevronRight size={16} />
        </div>
      </div>
    </Link>
  );
}
