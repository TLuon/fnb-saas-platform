import { useEffect, useRef, useState } from 'react';
import { useAnalyticsStore } from '../store/analyticsStore';
import { BranchDateFilter } from '../components/analytics/BranchDateFilter';
import { MetricStrip } from '../components/analytics/MetricStrip';
import { RevenueChart } from '../components/analytics/RevenueChart';
import { TopProductsTable } from '../components/analytics/TopProductsTable';
import { PaymentBreakdown } from '../components/analytics/PaymentBreakdown';
import { RevenueOrdersPanel } from '../components/analytics/RevenueOrdersPanel';
import { OccupiedTablesModal } from '../components/analytics/OccupiedTablesModal';

export default function Analytics() {
  const {
    dashboardData,
    revenueOrders,
    loading,
    ordersLoading,
    error,
    ordersError,
    fetchDashboard,
    fetchRevenueOrders
  } = useAnalyticsStore();
  const [branchId, setBranchId] = useState('all');
  const [period, setPeriod] = useState('today');
  const [isTablesModalOpen, setIsTablesModalOpen] = useState(false);
  const ordersSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetchDashboard(branchId, period);
    fetchRevenueOrders(branchId, period);
  }, [branchId, period, fetchDashboard, fetchRevenueOrders]);

  const openTransactions = () => ordersSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (loading && !dashboardData) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"></div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="font-semibold text-red-700">{error ?? 'Không thể tải báo cáo'}</p>
        <button
          type="button"
          onClick={() => fetchDashboard(branchId, period)}
          className="rounded-md bg-[#5A310F] px-4 py-2 text-sm font-semibold text-white"
        >
          Tải lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">Analytics</h2>
        <p className="text-gray-500 mt-2">Báo cáo kinh doanh & Phân tích doanh thu</p>
      </div>

      <BranchDateFilter
        branchId={branchId}
        setBranchId={setBranchId}
        period={period}
        setPeriod={setPeriod}
      />

      <MetricStrip
        data={dashboardData}
        onOpenTransactions={openTransactions}
        onOpenOccupiedTables={() => setIsTablesModalOpen(true)}
      />

      <div className="w-full">
        <RevenueChart data={dashboardData.chartData} />
      </div>

      <RevenueOrdersPanel
        orders={revenueOrders}
        loading={ordersLoading}
        error={ordersError}
        onRetry={() => fetchRevenueOrders(branchId, period)}
        registerSection={(element) => { ordersSectionRef.current = element; }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsTable products={dashboardData.topProducts} />
        <PaymentBreakdown data={dashboardData.paymentBreakdown} />
      </div>

      <OccupiedTablesModal
        isOpen={isTablesModalOpen}
        onClose={() => setIsTablesModalOpen(false)}
        branchId={branchId}
        onTableUpdated={() => {
          fetchDashboard(branchId, period);
        }}
      />
    </div>
  );
}
