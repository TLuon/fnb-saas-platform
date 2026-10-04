import { useEffect, useState } from 'react';
import { useSupportStore } from '../store/supportStore';
import { SupportHeader } from '../components/support/SupportHeader';
import { UnmatchedQueueTable } from '../components/support/UnmatchedQueueTable';
import { TransactionDetailDrawer } from '../components/support/TransactionDetailDrawer';

export default function SupportBoard() {
  const { unmatchedTransactions, loading, socketConnected, fetchUnmatched } = useSupportStore();
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  useEffect(() => {
    fetchUnmatched();
  }, [fetchUnmatched]);

  const selectedTx = unmatchedTransactions.find(t => t.id === selectedTxId) || null;
  const pendingCount = unmatchedTransactions.filter(t => t.status === 'PENDING').length;

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      <SupportHeader connected={socketConnected} pendingCount={pendingCount} />

      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className={`transition-all duration-300 ease-in-out ${selectedTxId ? 'w-full lg:w-1/2 hidden lg:block' : 'w-full'}`}>
          <UnmatchedQueueTable 
            transactions={unmatchedTransactions} 
            selectedId={selectedTxId}
            onSelect={(id) => setSelectedTxId(id === selectedTxId ? null : id)}
          />
        </div>

        {selectedTxId && (
          <TransactionDetailDrawer 
            transaction={selectedTx} 
            onClose={() => setSelectedTxId(null)}
          />
        )}
      </div>

      {loading && unmatchedTransactions.length === 0 && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"></div>
        </div>
      )}
    </div>
  );
}
