import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DashboardData } from '../../store/analyticsStore';

interface RevenueChartProps {
  data: DashboardData['chartData'];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatYAxis = (value: number) => {
    if (value === 0) return '0';
    if (value >= 1_000_000) {
      const formatted = (value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1);
      return `${formatted} Tr`;
    }
    if (value >= 1_000) {
      const formatted = (value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1);
      return `${formatted}k`;
    }
    return value.toLocaleString('vi-VN');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-xl">
          <p className="font-bold text-gray-700 mb-1">{label}</p>
          <p className="text-[var(--color-brand-secondary)] font-black">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const hasRevenue = data && data.some((d) => d.revenue > 0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E8DED5] shadow-sm h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-[#543310]">Biểu đồ doanh thu</h3>
          {!hasRevenue && (
            <p className="text-xs text-gray-400 mt-1">Chưa có giao dịch phát sinh doanh thu trong khoảng thời gian này</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
          <span className="w-3 h-3 rounded-full bg-[var(--color-brand-secondary)]"></span>
          Doanh thu (VNĐ)
        </div>
      </div>
      
      <div className="flex-1 w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D67D3E" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#D67D3E" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#888', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#888', fontSize: 12 }}
              tickFormatter={formatYAxis}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#D67D3E" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
