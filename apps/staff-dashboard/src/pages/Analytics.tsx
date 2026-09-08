import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface DashboardData {
  revenue_today: number;
  occupancy_rate: number;
  total_tables: number;
  occupied_tables: number;
  top_products: Array<{
    product_id: string;
    product_name: string;
    total_quantity: number;
  }>;
}

export default function Analytics() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.accessToken);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const branchId = '22222222-2222-2222-2222-222222222222';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/reports/dashboard?branch_id=${branchId}`, { headers });
      if (res.ok) {
        const resJson = await res.json();
        const payload = resJson?.data ?? resJson;
        setData({
          revenue_today: Number(payload.revenue_today || 0),
          occupancy_rate: Number(payload.occupancy_rate || 0),
          total_tables: Number(payload.total_tables || 0),
          occupied_tables: Number(payload.occupied_tables || 0),
          top_products: Array.isArray(payload.top_products) ? payload.top_products : [],
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải báo cáo dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const maxTopQty = data?.top_products?.length
    ? Math.max(...data.top_products.map((p) => Number(p.total_quantity || 1)), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">
            Báo cáo Doanh thu
          </h2>
          <p className="text-gray-500 mt-2">Tổng quan tình hình kinh doanh hôm nay từ backend thật</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Doanh thu hôm nay */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-brand-accent)] opacity-10 rounded-bl-full group-hover:scale-110 transition-transform"></div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-[var(--color-brand-accent)]/30 rounded-2xl text-[var(--color-brand-secondary)]">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Doanh thu hôm nay
              </p>
              <p className="text-3xl font-black font-serif text-[var(--color-brand-primary)] mt-1">
                {loading
                  ? 'Đang tải...'
                  : `${(data?.revenue_today ?? 0).toLocaleString('vi-VN')} ₫`}
              </p>
            </div>
          </div>
        </div>

        {/* Tỷ lệ lấp đầy */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-brand-accent)] opacity-10 rounded-bl-full group-hover:scale-110 transition-transform"></div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-[var(--color-brand-accent)]/30 rounded-2xl text-[var(--color-brand-secondary)]">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Tỷ lệ lấp đầy
              </p>
              <p className="text-3xl font-black font-serif text-[var(--color-brand-primary)] mt-1">
                {loading
                  ? '...'
                  : `${Math.round((data?.occupancy_rate ?? 0) * 100)}%`}
              </p>
            </div>
          </div>
        </div>

        {/* Bàn đang phục vụ */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-brand-accent)] opacity-10 rounded-bl-full group-hover:scale-110 transition-transform"></div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-[var(--color-brand-accent)]/30 rounded-2xl text-[var(--color-brand-secondary)]">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Bàn đang có khách
              </p>
              <p className="text-3xl font-black font-serif text-[var(--color-brand-primary)] mt-1">
                {loading
                  ? '...'
                  : `${data?.occupied_tables ?? 0} / ${data?.total_tables ?? 0}`}
              </p>
            </div>
          </div>
        </div>

        {/* Tổng số bàn */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-brand-accent)] opacity-10 rounded-bl-full group-hover:scale-110 transition-transform"></div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-[var(--color-brand-accent)]/30 rounded-2xl text-[var(--color-brand-secondary)]">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Tổng quy mô bàn
              </p>
              <p className="text-3xl font-black font-serif text-[var(--color-brand-primary)] mt-1">
                {loading ? '...' : `${data?.total_tables ?? 0} bàn`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Top món bán chạy */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-[var(--color-brand-primary)] mb-6">
            Top món bán chạy (fn_top_products)
          </h3>
          {loading ? (
            <p className="text-gray-400 text-sm">Đang tải danh sách món...</p>
          ) : !data?.top_products?.length ? (
            <p className="text-gray-400 text-sm py-4">Chưa có dữ liệu món bán hoàn tất trong ngày.</p>
          ) : (
            <div className="space-y-4">
              {data.top_products.map((item, idx) => {
                const qty = Number(item.total_quantity || 0);
                const percent = Math.round((qty / maxTopQty) * 100);
                return (
                  <div key={item.product_id || idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-[var(--color-brand-primary)]">
                        {item.product_name}
                      </span>
                      <span className="text-[var(--color-brand-secondary)] font-bold">
                        {qty} phần
                      </span>
                    </div>
                    <div className="w-full bg-[var(--color-brand-neutral)] rounded-full h-2.5">
                      <div
                        className="bg-[var(--color-brand-accent)] h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Thông tin vận hành */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-brand-primary)] mb-4">
              Chỉ số vận hành chi nhánh
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Số liệu phản ánh tức thì từ cơ sở dữ liệu Supabase qua các hàm tổng hợp SQL bảo đảm RLS.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-3 bg-[var(--color-brand-neutral)] rounded-xl">
                <span className="text-gray-600 font-medium">Bàn đang phục vụ:</span>
                <span className="font-bold text-[var(--color-brand-primary)]">
                  {data?.occupied_tables ?? 0} bàn
                </span>
              </div>
              <div className="flex justify-between p-3 bg-[var(--color-brand-neutral)] rounded-xl">
                <span className="text-gray-600 font-medium">Bàn còn trống:</span>
                <span className="font-bold text-green-600">
                  {Math.max(0, (data?.total_tables ?? 0) - (data?.occupied_tables ?? 0))} bàn
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              onClick={fetchDashboard}
              className="px-4 py-2 bg-[var(--color-brand-primary)] text-white rounded-xl text-xs font-bold hover:bg-[var(--color-brand-secondary)] transition shadow-sm"
            >
              Làm mới dữ liệu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
