import { useState, useEffect } from 'react';
import { useSupportStore, type SuggestedMatch } from '../store/supportStore';
import { useAuthStore } from '../store/authStore';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function SupportBoard() {
  const { transactions, propose, approve, fetchTransactions, suggestMatch } = useSupportStore();
  const { currentUser } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState('');
  const [showFuzzyModal, setShowFuzzyModal] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedMatch[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const openFuzzyModal = async (txId: string) => {
    setShowFuzzyModal(txId);
    setLoadingSuggestions(true);
    const results = await suggestMatch(txId);
    setSuggestions(results);
    setLoadingSuggestions(false);
  };

  const handlePropose = (txId: string, customerId: string) => {
    propose(txId, customerId, currentUser.id);
    setShowFuzzyModal(null);
  };

  const handleApprove = (txId: string) => {
    setErrorMsg('');
    try {
      approve(txId, currentUser.id);
    } catch (err: any) {
      setErrorMsg(err.message === 'ERR_6002_SELF_APPROVAL' 
        ? 'Lỗi 6002: Bạn không thể tự duyệt đề xuất của chính mình!' 
        : 'Lỗi không xác định');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">Hàng đợi Tra soát</h2>
          <p className="text-gray-500 mt-2">Xử lý các giao dịch VietQR bị treo do sai nội dung</p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-xl shadow-sm flex items-center gap-3 animate-pulse">
          <AlertCircle size={24} />
          <p className="font-bold">{errorMsg}</p>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-brand-secondary)] text-white">
              <th className="p-4 font-semibold">Mã GD</th>
              <th className="p-4 font-semibold text-right">Số tiền</th>
              <th className="p-4 font-semibold">Nội dung CK</th>
              <th className="p-4 font-semibold text-center">Trạng thái</th>
              <th className="p-4 font-semibold text-right">Thao tác (Maker/Checker)</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  Hiện không có giao dịch chuyển khoản nào bị treo.
                </td>
              </tr>
            ) : (
              transactions.map(tx => (
                <tr key={tx.id} className="border-b border-gray-50 hover:bg-[var(--color-brand-accent)]/20 transition">
                  <td className="p-4 font-medium text-[var(--color-brand-primary)]">{tx.id}</td>
                  <td className="p-4 text-right font-bold text-[var(--color-brand-secondary)]">{tx.amount.toLocaleString('vi-VN')} ₫</td>
                  <td className="p-4 text-sm text-gray-600 italic">"{tx.content}"</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                      tx.status === 'UNMATCHED' ? 'bg-gray-100 text-gray-500' :
                      tx.status === 'PENDING_APPROVAL' ? 'bg-[var(--color-brand-accent)] text-[var(--color-brand-secondary)]' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {tx.status === 'UNMATCHED' && <AlertCircle size={14} />}
                      {tx.status === 'PENDING_APPROVAL' && <Clock size={14} />}
                      {tx.status === 'RESOLVED' && <CheckCircle size={14} />}
                      {tx.status}
                    </span>
                    {tx.status === 'PENDING_APPROVAL' && (
                      <p className="text-[10px] text-gray-400 mt-1">Maker: {tx.makerId}</p>
                    )}
                  </td>
                  <td className="p-4 flex justify-end gap-2">
                    {tx.status === 'UNMATCHED' && (
                      <button 
                        onClick={() => openFuzzyModal(tx.id)}
                        className="bg-white border border-[var(--color-brand-secondary)] text-[var(--color-brand-secondary)] px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-[var(--color-brand-secondary)] hover:text-white transition shadow-sm"
                      >
                        Tạo Đề xuất (Maker)
                      </button>
                    )}
                    {tx.status === 'PENDING_APPROVAL' && (() => {
                      const isSelfApproval = tx.makerId === currentUser.id;
                      return (
                        <button
                          onClick={() => handleApprove(tx.id)}
                          disabled={isSelfApproval}
                          title={isSelfApproval ? 'Bạn không thể tự duyệt đề xuất của chính mình' : 'Phê duyệt đề xuất'}
                          className={`px-3 py-1.5 rounded-lg text-sm font-bold transition shadow-md ${
                            isSelfApproval
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                              : 'bg-[var(--color-brand-primary)] text-white hover:bg-[var(--color-brand-secondary)]'
                          }`}
                        >
                          Duyệt (Checker)
                        </button>
                      );
                    })()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showFuzzyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl">
            <h3 className="text-2xl font-black font-serif text-[var(--color-brand-primary)] mb-2">Gợi ý Khách hàng (Fuzzy Match)</h3>
            <p className="text-gray-500 mb-6 text-sm">Hệ thống phân tích nội dung chuyển khoản bằng fn_suggest_customer_match.</p>
            
            {loadingSuggestions ? (
              <div className="py-8 text-center text-gray-400">Đang tìm kiếm gợi ý khách hàng...</div>
            ) : suggestions.length === 0 ? (
              <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-2xl mb-6">
                Không tìm thấy khách hàng nào khớp với nội dung chuyển khoản này.
              </div>
            ) : (
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {suggestions.map((s) => (
                  <div key={s.customer_id} className="bg-[var(--color-brand-neutral)] border border-[var(--color-brand-accent)] p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[var(--color-brand-primary)]">{s.full_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.phone ? `SĐT: ${s.phone} • ` : ''}Độ khớp: {Math.round((s.similarity || 0) * 100)}%
                      </p>
                    </div>
                    <button
                      onClick={() => handlePropose(showFuzzyModal, s.customer_id)}
                      className="bg-[var(--color-brand-secondary)] text-white font-bold px-4 py-2 rounded-lg hover:bg-[var(--color-brand-primary)] transition text-sm"
                    >
                      Gán khách này
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button 
                onClick={() => setShowFuzzyModal(null)}
                className="text-gray-500 hover:text-[var(--color-brand-primary)] font-bold px-4 py-2 text-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
