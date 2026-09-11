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
        // GET /api/v1/wallet/balance
        const balRes: any = await apiClient.get('/wallet/balance').catch(() => ({ main: 150000, promo: 50000 }));
        setBalance(balRes);

        // GET /api/v1/wallet/transactions
        const txnRes: any = await apiClient.get('/wallet/transactions').catch(() => ([
          { id: '1', type: 'TOP_UP', amount: 200000, description: 'Nạp tiền ví FNB', created_at: new Date().toISOString() },
          { id: '2', type: 'PAYMENT', amount: 50000, description: 'Thanh toán đơn hàng #O-123', created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: '3', type: 'REFUND', amount: 25000, description: 'Hoàn tiền đơn hàng hủy #O-120', created_at: new Date(Date.now() - 172800000).toISOString() },
          { id: '4', type: 'PAYMENT', amount: 30000, description: 'Thanh toán đơn hàng #O-099', created_at: new Date(Date.now() - 345600000).toISOString() },
          { id: '5', type: 'TOP_UP', amount: 100000, description: 'Nạp tiền ví FNB', created_at: new Date(Date.now() - 518400000).toISOString() },
        ]));
        setTransactions(txnRes);

        // GET /api/v1/vouchers
        const vchRes: any = await apiClient.get('/vouchers').catch(() => ([
          { id: 'v1', code: 'WELCOME50', title: 'Giảm 50% cho bạn mới', description: 'Giảm tối đa 30K cho đơn từ 0đ', expires_at: new Date(Date.now() + 864000000).toISOString(), status: 'ACTIVE' },
          { id: 'v2', code: 'FNB10K', title: 'Giảm 10K', description: 'Áp dụng cho đơn từ 50K', expires_at: new Date(Date.now() + 1728000000).toISOString(), status: 'ACTIVE' },
          { id: 'v3', code: 'USED20', title: 'Giảm 20K', description: 'Đã sử dụng ngày hôm qua', expires_at: new Date(Date.now() + 864000000).toISOString(), status: 'USED' },
          { id: 'v4', code: 'EXPIRED', title: 'Giảm 15%', description: 'Đã hết hạn sử dụng', expires_at: new Date(Date.now() - 864000000).toISOString(), status: 'EXPIRED' }
        ]));
        setVouchers(vchRes);
        
        // Use profile data if we have an endpoint, mock for now
        setCustomerName('Tuấn Nguyễn');
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
