import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Receipt } from 'lucide-react';
import type { DashboardData } from '../../store/analyticsStore';

interface MetricStripProps {
  data: DashboardData;
}

export function MetricStrip({ data }: MetricStripProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Revenue */}
      <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E8DED5] shadow-sm flex flex-col justify-between hover:shadow-md transition">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wide">Tổng doanh thu</h3>
          <div className="p-2 bg-[var(--color-brand-accent)]/20 rounded-xl">
            <DollarSign size={20} className="text-[var(--color-brand-secondary)]" />
          </div>
        </div>
        <div>
          <p className="text-3xl font-black text-[#543310]">{formatCurrency(data.revenue)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`flex items-center gap-1 text-sm font-bold ${data.revenueTrend >= 0 ? 'text-[var(--color-brand-success)]' : 'text-[#D67D3E]'}`}>
              {data.revenueTrend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(data.revenueTrend)}%
            </span>
            <span className="text-gray-400 text-sm">so với kỳ trước</span>
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E8DED5] shadow-sm flex flex-col justify-between hover:shadow-md transition">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wide">Tổng số đơn</h3>
          <div className="p-2 bg-[var(--color-brand-accent)]/20 rounded-xl">
            <ShoppingBag size={20} className="text-[var(--color-brand-secondary)]" />
          </div>
        </div>
        <div>
          <p className="text-3xl font-black text-[#543310]">{data.ordersCount.toLocaleString('vi-VN')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`flex items-center gap-1 text-sm font-bold ${data.ordersTrend >= 0 ? 'text-[var(--color-brand-success)]' : 'text-[#D67D3E]'}`}>
              {data.ordersTrend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(data.ordersTrend)}%
            </span>
            <span className="text-gray-400 text-sm">so với kỳ trước</span>
          </div>
        </div>
      </div>

      {/* Occupied tables */}
      <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E8DED5] shadow-sm flex flex-col justify-between hover:shadow-md transition">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wide">Bàn đang phục vụ</h3>
          <div className="p-2 bg-[var(--color-brand-accent)]/20 rounded-xl">
            <Users size={20} className="text-[var(--color-brand-secondary)]" />
          </div>
        </div>
        <div>
          <p className="text-3xl font-black text-[#543310]">{data.occupiedTables}</p>
          <div className="mt-2">
            <span className="text-gray-400 text-sm">Real-time (Cập nhật liên tục)</span>
          </div>
        </div>
      </div>

      {/* Average order value */}
      <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E8DED5] shadow-sm flex flex-col justify-between hover:shadow-md transition">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wide">Giá trị TB / Đơn</h3>
          <div className="p-2 bg-[var(--color-brand-accent)]/20 rounded-xl">
            <Receipt size={20} className="text-[var(--color-brand-secondary)]" />
          </div>
        </div>
        <div>
          <p className="text-3xl font-black text-[#543310]">{formatCurrency(data.averageOrderValue)}</p>
          <div className="mt-2">
            <span className="text-gray-400 text-sm">Doanh thu / Tổng đơn</span>
          </div>
        </div>
      </div>
    </div>
  );
}
