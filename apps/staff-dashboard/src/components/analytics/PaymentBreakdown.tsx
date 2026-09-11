import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { DashboardData } from '../../store/analyticsStore';

interface PaymentBreakdownProps {
  data: DashboardData['paymentBreakdown'];
}

export function PaymentBreakdown({ data }: PaymentBreakdownProps) {
  const COLORS = ['#D67D3E', '#543310', '#A99B8E', '#237A57'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl">
          <p className="font-bold text-gray-700 mb-1">{data.method}</p>
          <p className="text-[var(--color-brand-primary)] font-black">
            {formatCurrency(data.amount)} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E8DED5] shadow-sm flex flex-col h-full">
      <h3 className="text-xl font-bold text-[#543310] mb-6">Tỷ lệ thanh toán</h3>
      
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6">
        <div className="w-48 h-48 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="percentage"
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 flex flex-col gap-4 w-full">
          {data.map((item, index) => (
            <div key={item.method} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                />
                <span className="font-semibold text-gray-700">{item.method}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-[var(--color-brand-primary)]">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
