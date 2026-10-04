import type { DashboardData } from '../../store/analyticsStore';

interface TopProductsTableProps {
  products: DashboardData['topProducts'];
}

export function TopProductsTable({ products }: TopProductsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E8DED5] shadow-sm flex flex-col h-full">
      <h3 className="text-xl font-bold text-[#543310] mb-6">Món bán chạy nhất</h3>
      
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-gray-500 text-sm uppercase tracking-wide border-b border-gray-100">
              <th className="pb-3 font-semibold">Tên món</th>
              <th className="pb-3 font-semibold text-center">Số lượng</th>
              <th className="pb-3 font-semibold text-right">Doanh thu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-400 font-medium">
                  Chưa có dữ liệu món bán trong kỳ
                </td>
              </tr>
            ) : (
              products.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-100 text-gray-700' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-400'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="font-bold text-[var(--color-brand-primary)]">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-center font-medium text-gray-600">
                    {p.quantity}
                  </td>
                  <td className="py-4 text-right font-bold text-[var(--color-brand-secondary)]">
                    {formatCurrency(p.revenue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
