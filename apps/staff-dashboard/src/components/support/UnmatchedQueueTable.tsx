import type { UnmatchedTransaction } from '../../store/supportStore';

interface UnmatchedQueueTableProps {
  transactions: UnmatchedTransaction[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function UnmatchedQueueTable({ transactions, selectedId, onSelect }: UnmatchedQueueTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-bold text-gray-700">Hàng đợi giao dịch lỗi</h3>
      </div>
      <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
        {transactions.map(tx => (
          <div 
            key={tx.id}
            onClick={() => onSelect(tx.id)}
            className={`p-4 cursor-pointer transition-all border-l-4 ${
              selectedId === tx.id ? 'bg-orange-50 border-l-[#D67D3E]' : 
              tx.status === 'PENDING' ? 'border-l-[#D67D3E] hover:bg-gray-50' : 
              'border-l-transparent hover:bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-[#543310]">{tx.bankRef}</span>
              <span className="font-bold text-[var(--color-brand-secondary)]">{formatCurrency(tx.amount)}</span>
            </div>
            <div className="text-sm text-gray-500 mb-2 truncate" title={tx.content}>
              Nội dung: <span className="font-semibold text-gray-700">{tx.content}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-gray-400">{formatDate(tx.date)}</span>
              <span className={`px-2 py-1 rounded-md ${
                tx.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {tx.status === 'PENDING' ? 'Chưa xử lý' : 'Đã đề xuất'}
              </span>
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="p-8 text-center text-gray-400 font-medium">
            Hàng đợi trống.
          </div>
        )}
      </div>
    </div>
  );
}
