import { useEffect, useState } from 'react';
import { useTicketStore } from '../store/ticketStore';
import { UrgentTicketQueue } from '../components/support/UrgentTicketQueue';
import { TicketDetailPanel } from '../components/support/TicketDetailPanel';
import { ResolveTicketModal } from '../components/support/ResolveTicketModal';
import { MergeCustomerModal } from '../components/support/MergeCustomerModal';
import { Ticket, Merge } from 'lucide-react';

export default function SupportTickets() {
  const { tickets, loading, fetchTickets, resolveTicket } = useTicketStore();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isResolveModalOpen, setResolveModalOpen] = useState(false);
  const [isMergeModalOpen, setMergeModalOpen] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  const handleResolve = async (note: string) => {
    if (selectedTicketId) {
      await resolveTicket(selectedTicketId, note);
      setSelectedTicketId(null);
    }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <Ticket size={24} className="text-[var(--color-brand-primary)]" />
          <h2 className="text-2xl font-black font-serif text-[var(--color-brand-primary)]">Support Tickets</h2>
        </div>
        
        <button 
          onClick={() => setMergeModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-[#B42318] border border-red-200 rounded-xl font-bold hover:bg-red-100 transition-colors shadow-sm"
        >
          <Merge size={18} />
          Hợp nhất Khách hàng
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className={`transition-all duration-300 ease-in-out ${selectedTicketId ? 'w-full lg:w-1/2 hidden lg:block' : 'w-full'}`}>
          <UrgentTicketQueue 
            tickets={tickets} 
            selectedId={selectedTicketId}
            onSelect={(id) => setSelectedTicketId(id === selectedTicketId ? null : id)}
          />
        </div>

        {selectedTicketId && (
          <TicketDetailPanel 
            ticket={selectedTicket} 
            onClose={() => setSelectedTicketId(null)}
            onResolveClick={() => setResolveModalOpen(true)}
          />
        )}
      </div>

      <ResolveTicketModal 
        isOpen={isResolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        onSubmit={handleResolve}
        ticketId={selectedTicketId || ''}
      />

      <MergeCustomerModal 
        isOpen={isMergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
      />

      {loading && tickets.length === 0 && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"></div>
        </div>
      )}
    </div>
  );
}
