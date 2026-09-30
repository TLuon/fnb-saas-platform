export function OrderHistoryTable({ history }: { history: { id: string; date: string; amount: number; branch: string; status?: string }[] }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-xl font-bold text-[#543310]">Lịch sử giao dịch</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wide">
              <th className="p-4 font-semibold">Mã đơn</th>
              <th className="p-4 font-semibold">Thời gian</th>
              <th className="p-4 font-semibold">Trạng thái</th>
              <th className="p-4 font-semibold">Chi nhánh</th>
              <th className="p-4 font-semibold text-right">Tổng tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {history.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-gray-700">{order.id}</td>
                <td className="p-4 text-gray-600 font-medium">{formatDate(order.date)}</td>
                <td className="p-4 text-gray-600 font-bold">{order.status || 'N/A'}</td>
                <td className="p-4 text-gray-600">{order.branch}</td>
                <td className="p-4 text-right font-bold text-[var(--color-brand-primary)]">
                  {formatCurrency(order.amount)}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">
                  Chưa có lịch sử giao dịch.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReservationHistoryTable({ history }: { history: { id: string; code: string; date: string; guests: number; status: string }[] }) {
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-xl font-bold text-[#543310]">Lịch sử đặt bàn</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wide">
              <th className="p-4 font-semibold">Mã đặt bàn</th>
              <th className="p-4 font-semibold">Thời gian</th>
              <th className="p-4 font-semibold">Số khách</th>
              <th className="p-4 font-semibold text-right">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {history.map((res) => (
              <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-gray-700">{res.code}</td>
                <td className="p-4 text-gray-600 font-medium">{formatDate(res.date)}</td>
                <td className="p-4 text-gray-600 font-bold">{res.guests} người</td>
                <td className="p-4 text-right font-bold text-[#D67D3E]">
                  {res.status}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400 font-medium">
                  Chưa có lịch sử đặt bàn.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
