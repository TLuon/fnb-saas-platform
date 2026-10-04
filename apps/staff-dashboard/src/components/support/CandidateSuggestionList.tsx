import type { Candidate } from '../../store/supportStore';

interface CandidateSuggestionListProps {
  candidates: Candidate[];
  selectedCandidateId: string | null;
  onSelect: (id: string) => void;
}

export function CandidateSuggestionList({ candidates, selectedCandidateId, onSelect }: CandidateSuggestionListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="space-y-3">
      <h4 className="font-bold text-gray-700 text-sm">Khách hàng có thể khớp (Gợi ý từ AI)</h4>
      {candidates.length === 0 ? (
        <p className="text-gray-400 text-sm italic">Không tìm thấy gợi ý nào</p>
      ) : (
        <div className="space-y-2">
          {candidates.map(c => (
            <label 
              key={c.id} 
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                selectedCandidateId === c.id 
                  ? 'border-[var(--color-brand-primary)] bg-orange-50/50' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input 
                type="radio" 
                name="candidate" 
                value={c.id}
                checked={selectedCandidateId === c.id}
                onChange={() => onSelect(c.id)}
                className="w-4 h-4 text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
              />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-800">{c.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    c.confidenceScore >= 90 ? 'bg-green-100 text-green-700' :
                    c.confidenceScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {c.confidenceScore}% Match
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{c.phone}</span>
                  <span className="font-semibold text-[var(--color-brand-secondary)]">
                    Đơn hàng: {formatCurrency(c.expectedAmount)}
                  </span>
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
