import { useNavigate } from 'react-router-dom';
import type { Customer } from '../../store/cdpStore';

interface CustomerTableProps {
  customers: Customer[];
}

export function CustomerTable({ customers }: CustomerTableProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'VIP': return 'bg-purple-100 text-purple-700';
      case 'LOYAL': return 'bg-blue-100 text-blue-700';
      case 'NEW': return 'bg-green-100 text-green-700';
      case 'CHURN_RISK': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-[var(--color-brand-secondary)] text-white">
              <th className="p-4 font-semibold whitespace-nowrap">Khách hàng</th>
              <th className="p-4 font-semibold whitespace-nowrap">Hạng (Tier)</th>
              <th className="p-4 font-semibold text-center whitespace-nowrap">Số lần ghé</th>
              <th className="p-4 font-semibold text-right whitespace-nowrap">Tổng chi tiêu</th>
              <th className="p-4 font-semibold text-right whitespace-nowrap">Phân khúc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {customers.map((c) => (
              <tr 
                key={c.id} 
                className="hover:bg-[var(--color-brand-accent)]/10 transition-colors cursor-pointer"
                onClick={() => navigate(`/cdp/customers/${c.id}`)}
              >
                <td className="p-4">
                  <div className="font-bold text-[var(--color-brand-primary)]">{c.name}</div>
                  <div className="text-sm text-gray-500">{c.phone}</div>
                </td>
                <td className="p-4 font-medium text-gray-700">{c.tier}</td>
                <td className="p-4 text-center font-bold text-gray-600">{c.visits}</td>
                <td className="p-4 text-right font-bold text-[var(--color-brand-secondary)]">
                  {formatCurrency(c.totalSpent)}
                </td>
                <td className="p-4 text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getSegmentColor(c.segment)}`}>
                    {c.segment}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <div className="p-12 text-center text-gray-400 font-medium">
            Không tìm thấy khách hàng nào trong phân khúc này.
          </div>
        )}
      </div>
    </div>
  );
}
