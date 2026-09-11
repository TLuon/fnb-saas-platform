import { X, ShieldCheck } from 'lucide-react';
import type { UnmatchedTransaction } from '../../store/supportStore';
import { useSupportStore } from '../../store/supportStore';
import { MakerProposalForm } from './MakerProposalForm';
import { CheckerApprovalModal } from './CheckerApprovalModal';
import { AuditTimeline } from './AuditTimeline';
import { useEffect } from 'react';

interface TransactionDetailDrawerProps {
  transaction: UnmatchedTransaction | null;
  onClose: () => void;
}

export function TransactionDetailDrawer({ transaction, onClose }: TransactionDetailDrawerProps) {
  const { candidates, auditLogs, fetchCandidates, fetchAuditLogs, proposeMatch, approveMatch, rejectMatch } = useSupportStore();

  useEffect(() => {
    if (transaction?.id) {
      fetchCandidates(transaction.id);
      fetchAuditLogs(transaction.id);
    }
  }, [transaction?.id, fetchCandidates, fetchAuditLogs]);

  if (!transaction) return null;

  const currentCandidates = candidates[transaction.id] || [];
  const currentLogs = auditLogs[transaction.id] || [];

  const proposedCustomer = currentCandidates.find(c => c.id === transaction.proposedCustomerId);

  return (
    <div className="w-full lg:w-1/2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[800px]">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[var(--color-brand-neutral)]">
        <div className="flex items-center gap-2 text-[var(--color-brand-primary)]">
          <ShieldCheck size={20} />
          <h2 className="font-bold text-lg">Chi tiết Giao dịch Không khớp</h2>
        </div>
        <button onClick={onClose} className="p-1 text-gray-500 hover:text-[var(--color-brand-error)] transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 bg-[#FAF7F3]">
        {/* Basic Info */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide font-bold mb-1">Mã tham chiếu (Bank Ref)</p>
              <p className="font-bold text-gray-800">{transaction.bankRef}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide font-bold mb-1">Số tiền</p>
              <p className="font-bold text-[var(--color-brand-secondary)] text-xl">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(transaction.amount)}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500 uppercase tracking-wide font-bold mb-1">Nội dung CK thực tế</p>
              <p className="font-mono bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-800">{transaction.content}</p>
            </div>
          </div>
        </div>

        {transaction.status === 'PENDING' && (
          <MakerProposalForm 
            candidates={currentCandidates}
            onSubmit={async (customerId) => {
              await proposeMatch(transaction.id, customerId);
            }}
          />
        )}

        {transaction.status === 'PROPOSED' && (
          <CheckerApprovalModal 
            transactionId={transaction.id}
            makerId={transaction.makerId!}
            proposedCustomerName={proposedCustomer?.name}
            onApprove={async () => await approveMatch(transaction.id)}
            onReject={async () => await rejectMatch(transaction.id)}
          />
        )}

        <AuditTimeline logs={currentLogs} />
      </div>
    </div>
  );
}
