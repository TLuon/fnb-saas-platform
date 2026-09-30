import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCdpStore } from '../store/cdpStore';
import { Customer360Header } from '../components/cdp/Customer360Header';
import { FavoriteItems, DietaryNotes } from '../components/cdp/CustomerProfileWidgets';
import { OrderHistoryTable, ReservationHistoryTable } from '../components/cdp/OrderHistoryTable';
import { IssueVoucherModal } from '../components/cdp/IssueVoucherModal';

export default function Customer360Page() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customer360, loading, fetchCustomer360, issueVoucher } = useCdpStore();
  const [isVoucherModalOpen, setVoucherModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomer360(id);
    }
  }, [id, fetchCustomer360]);

  if (loading || !customer360) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"></div>
      </div>
    );
  }

  const handleIssueVoucher = async (discountPercent: number) => {
    if (id) {
      await issueVoucher(id, discountPercent);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/cdp')}
          className="flex items-center gap-2 text-gray-500 hover:text-[var(--color-brand-primary)] transition-colors font-semibold"
        >
          <ArrowLeft size={20} />
          Quay lại danh sách
        </button>
        <button 
          onClick={() => setVoucherModalOpen(true)}
          className="bg-[var(--color-brand-primary)] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#3d250c] transition shadow-md"
        >
          Tặng Voucher Đặc Quyền
        </button>
      </div>

      <Customer360Header customer={customer360} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FavoriteItems items={customer360.favoriteItems} />
        <DietaryNotes notes={customer360.dietaryNotes} />
      </div>

      <OrderHistoryTable history={customer360.orderHistory} />
      <ReservationHistoryTable history={customer360.reservationHistory || []} />

      <IssueVoucherModal 
        isOpen={isVoucherModalOpen}
        onClose={() => setVoucherModalOpen(false)}
        onSubmit={handleIssueVoucher}
        customerName={customer360.name}
      />
    </div>
  );
}
