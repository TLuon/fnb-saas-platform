import { useEffect, useState } from 'react';
import { useAnalyticsStore } from '../store/analyticsStore';
import { BranchDateFilter } from '../components/analytics/BranchDateFilter';
import { MetricStrip } from '../components/analytics/MetricStrip';
import { RevenueChart } from '../components/analytics/RevenueChart';
import { TopProductsTable } from '../components/analytics/TopProductsTable';
import { PaymentBreakdown } from '../components/analytics/PaymentBreakdown';

export default function Analytics() {
  const { dashboardData, loading, fetchDashboard } = useAnalyticsStore();
  const [branchId, setBranchId] = useState('all');
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    fetchDashboard(branchId, period);
  }, [branchId, period, fetchDashboard]);

  if (loading || !dashboardData) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"></div>
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

      <MetricStrip data={dashboardData} />

      <div className="w-full">
        <RevenueChart data={dashboardData.chartData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsTable products={dashboardData.topProducts} />
        <PaymentBreakdown data={dashboardData.paymentBreakdown} />
      </div>
    </div>
  );
}
