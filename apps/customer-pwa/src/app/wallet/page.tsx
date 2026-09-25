'use client';

import React, { useEffect, useState } from 'react';
import { PublicHeader } from '../../components/PublicHeader';
import { WalletCard } from '../../components/wallet/WalletCard';
import { TopUpModal } from '../../components/wallet/TopUpModal';
import { TransactionFilters, TransactionType } from '../../components/wallet/TransactionFilters';
import { TransactionList } from '../../components/wallet/TransactionList';
import { VoucherList } from '../../components/wallet/VoucherList';
import { Pagination } from '../../components/Pagination';
import { apiClient } from '@fnb/utils';
import { PlusCircle } from 'lucide-react';

export default function WalletPage() {
  const [balance, setBalance] = useState({ main: 0, promo: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [filter, setFilter] = useState<TransactionType>('ALL');
  
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('Khách hàng');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // GET /wallet
        const balRes: any = await apiClient.get('/wallet').catch(() => null);
        if (balRes) {
          const w = balRes.data?.data || balRes.data || balRes;
          setBalance({ main: Number(w.main_balance || 0), promo: Number(w.promo_balance || 0) });
        }

        // GET /wallet/transactions
        const txnRes: any = await apiClient.get('/wallet/transactions').catch(() => null);
        if (txnRes) {
          const tList = txnRes.data?.data || txnRes.data || (Array.isArray(txnRes) ? txnRes : []);
          const mappedTxns = (Array.isArray(tList) ? tList : []).map((t: any) => ({
            id: t.id,
            type: t.type === 'TOPUP' ? 'TOP_UP' : (t.type === 'PAYMENT' ? 'PAYMENT' : 'REFUND'),
            amount: Number(t.amount || 0),
            description: t.description || (t.type === 'TOPUP' ? 'Nạp tiền ví FNB' : 'Thanh toán đơn hàng'),
            created_at: t.created_at || new Date().toISOString(),
          }));
          setTransactions(mappedTxns);
        }

        // GET /wallet/vouchers
        const vchRes: any = await apiClient.get('/wallet/vouchers').catch(() => null);
        if (vchRes) {
          const vList = vchRes.vouchers || vchRes.data?.vouchers || vchRes.data || (Array.isArray(vchRes) ? vchRes : []);
          const mappedVouchers = (Array.isArray(vList) ? vList : []).map((v: any) => ({
            id: v.id,
            code: v.voucher_code || (v.discount_percent ? `GIAM${v.discount_percent}%` : 'VOUCHER'),
            title: v.discount_percent ? `Giảm ${v.discount_percent}% đơn hàng` : (v.free_item_product_id ? 'Tặng 1 món đồ uống miễn phí' : 'Voucher thành viên'),
            description: v.source === 'CSAT_APOLOGY' ? 'Voucher tri ân từ CSKH' : 'Ưu đãi dành riêng cho bạn',
            expires_at: v.expires_at,
            status: v.is_used ? 'USED' : 'ACTIVE',
          }));
          setVouchers(mappedVouchers);
        }
        
        const profile = (apiClient as any)?.authStore?.getState?.()?.profile;
        if (profile?.full_name) {
          setCustomerName(profile.full_name);
        }
      } catch (err) {
        console.error('Lỗi lấy dữ liệu ví:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);


  const handleTopUpSuccess = (newBalance: number) => {
    // Topup gọi qua backend, chỉ refresh balance SAU KHI API trả success.
    setBalance(prev => ({ ...prev, main: prev.main + newBalance })); 
    setTransactions([{
      id: Date.now().toString(),
      type: 'TOP_UP',
      amount: newBalance,
      description: 'Nạp tiền ví FNB',
      created_at: new Date().toISOString()
    }, ...transactions]);
  };

  const filteredTxns = transactions.filter(t => filter === 'ALL' || t.type === filter);
  
  // Fake pagination logic for demo
  const itemsPerPage = 3;
  const totalPages = Math.ceil(filteredTxns.length / itemsPerPage);
  const paginatedTxns = filteredTxns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F3] flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#543310]"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col pb-24">
      <PublicHeader />
      
      <div className="max-w-screen-xl mx-auto w-full p-4 space-y-6 mt-4">
        
        {/* Wallet Card Section */}
        <section className="flex flex-col items-center">
          <WalletCard 
            customerName={customerName} 
            mainBalance={balance.main} 
            promoBalance={balance.promo} 
          />
          <button 
            onClick={() => setIsTopUpOpen(true)}
            className="w-full max-w-sm py-4 mt-4 bg-[#543310] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#D67D3E] transition-colors shadow-sm"
          >
            <PlusCircle size={20} /> Nạp tiền vào ví
          </button>
        </section>

        <hr className="border-[#E8DED5]" />

        {/* Voucher Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold font-serif text-[#543310]">Voucher của bạn</h2>
            <span className="text-sm font-bold text-[#D67D3E]">{vouchers.filter(v => v.status === 'ACTIVE').length} khả dụng</span>
          </div>
          <VoucherList vouchers={vouchers} />
        </section>

        <hr className="border-[#E8DED5]" />

        {/* Transaction History Section */}
        <section>
          <h2 className="text-lg font-bold font-serif text-[#543310] mb-4">Lịch sử giao dịch</h2>
          <TransactionFilters filter={filter} onChange={(f) => { setFilter(f); setCurrentPage(1); }} />
          <TransactionList transactions={paginatedTxns} />
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
          />
        </section>
      </div>

      <TopUpModal 
        isOpen={isTopUpOpen} 
        onClose={() => setIsTopUpOpen(false)} 
        onSuccess={handleTopUpSuccess} 
      />
    </main>
  );
}
