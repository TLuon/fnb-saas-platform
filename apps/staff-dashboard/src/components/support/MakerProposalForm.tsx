import { useState } from 'react';
import type { Candidate } from '../../store/supportStore';
import { CandidateSuggestionList } from './CandidateSuggestionList';

interface MakerProposalFormProps {
  candidates: Candidate[];
  onSubmit: (customerId: string) => Promise<void>;
}

export function MakerProposalForm({ candidates, onSubmit }: MakerProposalFormProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit(selectedId);
      setSelectedId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mt-6">
      <h3 className="font-bold text-[#543310] mb-4 border-b border-gray-100 pb-2">Đề xuất ghép nối (Maker)</h3>
      
      <CandidateSuggestionList 
        candidates={candidates} 
        selectedCandidateId={selectedId}
        onSelect={setSelectedId}
      />

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-[var(--color-brand-error)] text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!selectedId || loading}
          className="px-6 py-2.5 bg-[#543310] text-white font-bold rounded-xl hover:bg-[#3d250c] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang xử lý...' : 'Đề xuất ghép'}
        </button>
      </div>
    </div>
  );
}
