import { ArrowDownRight, ArrowUpRight, Trash2 } from 'lucide-react';
import type { InventoryTransaction } from '../../store/inventoryStore';

interface InventoryTransactionsProps {
  transactions: InventoryTransaction[];
}

export function InventoryTransactions({ transactions }: InventoryTransactionsProps) {
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const getTypeUI = (type: string) => {
    switch (type) {
      case 'IN':
        return { color: 'text-[#237A57]', bg: 'bg-green-100', icon: <ArrowDownRight size={16} />, label: 'Nhập kho' };
      case 'OUT':
        return { color: 'text-blue-600', bg: 'bg-blue-100', icon: <ArrowUpRight size={16} />, label: 'Xuất kho' };
      case 'WASTE':
        return { color: 'text-[#B42318]', bg: 'bg-red-100', icon: <Trash2 size={16} />, label: 'Báo hỏng / Hủy' };
      case 'ADJUSTMENT':
        return { color: 'text-purple-700', bg: 'bg-purple-100', icon: null, label: 'Điều chỉnh' };
      case 'ORDER_CONSUMPTION':
        return { color: 'text-blue-700', bg: 'bg-blue-100', icon: <ArrowUpRight size={16} />, label: 'Trừ theo đơn' };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-100', icon: null, label: type };
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h3 className="font-bold text-gray-700">Lịch sử Giao dịch Kho</h3>
        <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition">
          Xuất báo cáo
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wide">
              <th className="p-4 font-semibold">Thời gian</th>
              <th className="p-4 font-semibold">Loại giao dịch</th>
              <th className="p-4 font-semibold">Nguyên vật liệu</th>
              <th className="p-4 font-semibold text-right">Số lượng</th>
              <th className="p-4 font-semibold">Người thực hiện</th>
              <th className="p-4 font-semibold">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {transactions.map((tx) => {
              const ui = getTypeUI(tx.type);
              
              return (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-600 font-medium whitespace-nowrap">{formatDate(tx.date)}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${ui.bg} ${ui.color}`}>
                      {ui.icon} {ui.label}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-800">{tx.ingredientName}</td>
                  <td className={`p-4 text-right font-black text-lg ${ui.color}`}>
                    {tx.type === 'IN' ? '+' : tx.type === 'ADJUSTMENT' ? '' : '-'}{tx.quantity.toLocaleString('vi-VN')}
                    {tx.balanceAfter !== null && (
                      <div className="text-xs text-gray-400 font-medium">
                        Tồn sau: {tx.balanceAfter.toLocaleString('vi-VN')}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-gray-600">{tx.user}</td>
                  <td className="p-4 text-gray-500 max-w-[200px] truncate" title={tx.note}>{tx.note}</td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">
                  Chưa có giao dịch kho.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
