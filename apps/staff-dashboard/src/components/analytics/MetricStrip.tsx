import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Receipt, ChevronRight, Package } from 'lucide-react';
import type { DashboardData } from '../../store/analyticsStore';

interface MetricStripProps {
  data: DashboardData;
  onOpenTransactions: () => void;
  onOpenOccupiedTables?: () => void;
}

export function MetricStrip({ data, onOpenTransactions, onOpenOccupiedTables }: MetricStripProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {/* Revenue */}
      <button type="button" onClick={onOpenTransactions} className="group min-h-[170px] bg-white p-6 rounded-lg border border-[#E8DED5] shadow-sm flex flex-col justify-between text-left hover:border-[#D67D3E] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#D67D3E] focus:ring-offset-2 transition">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wide">Tổng doanh thu</h3>
          <div className="p-2 bg-[var(--color-brand-accent)]/20 rounded-lg">
            <DollarSign size={20} className="text-[var(--color-brand-secondary)]" />
          </div>
        </div>
        <div>
          <p className="text-2xl lg:text-3xl font-black text-[#543310]">{formatCurrency(data.revenue)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`flex items-center gap-1 text-sm font-bold ${data.revenueTrend >= 0 ? 'text-[var(--color-brand-success)]' : 'text-[#D67D3E]'}`}>
              {data.revenueTrend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(data.revenueTrend)}%
            </span>
            <span className="text-gray-400 text-sm">so với kỳ trước</span>
          </div>
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#8A4B1F] opacity-70 group-hover:opacity-100">Xem giao dịch <ChevronRight size={14} /></span>
      </button>

      {/* Orders */}
      <button type="button" onClick={onOpenTransactions} className="group min-h-[170px] bg-white p-6 rounded-lg border border-[#E8DED5] shadow-sm flex flex-col justify-between text-left hover:border-[#D67D3E] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#D67D3E] focus:ring-offset-2 transition">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wide">Tổng số đơn</h3>
          <div className="p-2 bg-[var(--color-brand-accent)]/20 rounded-lg">
            <ShoppingBag size={20} className="text-[var(--color-brand-secondary)]" />
          </div>
        </div>
        <div>
          <p className="text-2xl lg:text-3xl font-black text-[#543310]">{data.ordersCount.toLocaleString('vi-VN')}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`flex items-center gap-1 text-sm font-bold ${data.ordersTrend >= 0 ? 'text-[var(--color-brand-success)]' : 'text-[#D67D3E]'}`}>
              {data.ordersTrend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(data.ordersTrend)}%
            </span>
            <span className="text-gray-400 text-sm">so với kỳ trước</span>
          </div>
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#8A4B1F] opacity-70 group-hover:opacity-100">Xem danh sách đơn <ChevronRight size={14} /></span>
      </button>

      {/* Occupied tables */}
      <button
        type="button"
        onClick={onOpenOccupiedTables}
        className="group min-h-[170px] bg-white p-6 rounded-lg border border-[#E8DED5] shadow-sm flex flex-col justify-between text-left hover:border-[#D67D3E] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#D67D3E] focus:ring-offset-2 transition cursor-pointer"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wide">Bàn đang phục vụ</h3>
          <div className="p-2 bg-[var(--color-brand-accent)]/20 rounded-lg group-hover:bg-[#D67D3E]/20 transition">
            <Users size={20} className="text-[var(--color-brand-secondary)]" />
          </div>
        </div>
        <div>
          <p className="text-2xl lg:text-3xl font-black text-[#543310]">{data.occupiedTables}</p>
          <div className="mt-2">
            <span className="text-gray-400 text-sm">Real-time (Cập nhật)</span>
          </div>
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#8A4B1F] opacity-70 group-hover:opacity-100">
          Xem danh sách bàn <ChevronRight size={14} />
        </span>
      </button>

      {/* Average order value */}
      <button type="button" onClick={onOpenTransactions} className="group min-h-[170px] bg-white p-6 rounded-lg border border-[#E8DED5] shadow-sm flex flex-col justify-between text-left hover:border-[#D67D3E] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#D67D3E] focus:ring-offset-2 transition">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wide">Giá trị TB / Đơn</h3>
          <div className="p-2 bg-[var(--color-brand-accent)]/20 rounded-lg">
            <Receipt size={20} className="text-[var(--color-brand-secondary)]" />
          </div>
        </div>
        <div>
          <p className="text-2xl lg:text-3xl font-black text-[#543310]">{formatCurrency(data.averageOrderValue)}</p>
          <div className="mt-2">
            <span className="text-gray-400 text-sm">Doanh thu / Tổng đơn</span>
          </div>
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#8A4B1F] opacity-70 group-hover:opacity-100">Đối chiếu đơn <ChevronRight size={14} /></span>
      </button>

      {/* Ingredient Cost */}
      <div className="group min-h-[170px] bg-white p-6 rounded-lg border border-[#E8DED5] shadow-sm flex flex-col justify-between text-left hover:border-[#D67D3E] hover:shadow-md transition">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wide">Chi phí nguyên liệu</h3>
          <div className="p-2 bg-[var(--color-brand-accent)]/20 rounded-lg">
            <Package size={20} className="text-[var(--color-brand-secondary)]" />
          </div>
        </div>
        <div>
          <p className="text-2xl lg:text-3xl font-black text-[#543310]">{formatCurrency(data.totalIngredientCost || 0)}</p>
          <div className="mt-2">
            <span className="text-gray-400 text-sm">Tổng chi phí nhập kho</span>
          </div>
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#8A4B1F] opacity-70">Theo kỳ báo cáo</span>
      </div>
    </div>
  );
}
