import { useState, useEffect } from 'react';
import { Search, Filter, Star, History, Gift } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function CDP() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const token = useAuthStore(state => state.accessToken);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${baseUrl}/cdp/customers?segment=ALL`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped = data.map((c: any) => ({
              id: c.id,
              name: c.full_name || 'Khách hàng',
              phone: c.phone || 'Chưa có SĐT',
              rfm: c.membership_tier || c.segment || 'VIP',
              points: c.loyalty_points || 0,
              spent: c.total_spent || 0,
            }));
            setCustomers(mapped);
            setSelectedCustomer(mapped[0]);
            return;
          }
        }
      } catch (e) {
        console.warn('Could not fetch CDP customers from API, using fallback data', e);
      }

      // Default fallback
      const fallback = [
        { id: 'C001', name: 'Nguyễn Văn A', phone: '0901234567', rfm: 'VIP', points: 1500, spent: 5000000 },
        { id: 'C002', name: 'Trần Thị B', phone: '0912345678', rfm: 'TIỀM NĂNG', points: 300, spent: 800000 },
        { id: 'C003', name: 'Lê Văn C', phone: '0923456789', rfm: 'RỜI BỎ', points: 50, spent: 150000 },
      ];
      setCustomers(fallback);
      setSelectedCustomer(fallback[0]);
    }

    loadCustomers();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">Hồ sơ Khách hàng</h2>
          <p className="text-gray-500 mt-2">Quản lý và phân khúc khách hàng theo RFM</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex items-center bg-white px-4 py-2 rounded-xl border border-gray-200 flex-1">
          <Search size={20} className="text-gray-400 mr-2" />
          <input type="text" placeholder="Tìm theo tên hoặc SĐT..." className="w-full outline-none" />
        </div>
        <button className="bg-white border border-gray-200 px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-gray-50">
          <Filter size={20} />
          Lọc phân khúc
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-brand-secondary)] text-white">
                <th className="p-4 font-semibold">Khách hàng</th>
                <th className="p-4 font-semibold">Phân khúc</th>
                <th className="p-4 font-semibold text-right">Tích lũy</th>
                <th className="p-4 font-semibold text-right">Đã chi tiêu</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-[var(--color-brand-accent)]/20 transition cursor-pointer">
                  <td className="p-4">
                    <p className="font-bold text-[var(--color-brand-primary)]">{c.name}</p>
                    <p className="text-sm text-gray-500">{c.phone}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      c.rfm === 'VIP' ? 'bg-[var(--color-brand-primary)] text-white' :
                      c.rfm === 'TIỀM NĂNG' ? 'bg-[var(--color-brand-accent)] text-[var(--color-brand-primary)]' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {c.rfm}
                    </span>
                  </td>
                  <td className="p-4 text-right font-semibold text-[var(--color-brand-secondary)]">{c.points} điểm</td>
                  <td className="p-4 text-right font-semibold text-[var(--color-brand-primary)]">{c.spent.toLocaleString('vi-VN')} ₫</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col gap-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[var(--color-brand-accent)]/40 to-transparent"></div>
          <div className="text-center relative z-10">
            <div className="w-24 h-24 bg-[var(--color-brand-secondary)] rounded-[2rem] rotate-3 mx-auto flex items-center justify-center text-white text-4xl font-black font-serif mb-4 shadow-xl group-hover:rotate-6 transition-transform">
              <span className="-rotate-3">{selectedCustomer?.name?.charAt(0) || 'K'}</span>
            </div>
            <h3 className="text-2xl font-black font-serif text-[var(--color-brand-primary)]">
              {selectedCustomer?.name || 'Khách hàng'}
            </h3>
            <p className="text-gray-500 mt-1 tracking-wider text-sm">
              {selectedCustomer?.phone || 'Chưa có SĐT'}
            </p>
            <span className="inline-block mt-3 px-5 py-1.5 bg-[var(--color-brand-primary)] text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-md">
              {selectedCustomer?.rfm || 'Khách hàng'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Star className="text-[var(--color-brand-secondary)]" size={24} />
              <div>
                <p className="text-xs text-gray-500 font-semibold">Điểm tích lũy</p>
                <p className="font-bold text-[var(--color-brand-primary)]">
                  {(selectedCustomer?.points || 0).toLocaleString()}
                </p>
              </div>
            </div>
            <button className="text-sm bg-[var(--color-brand-accent)] text-[var(--color-brand-primary)] font-bold px-3 py-1 rounded hover:bg-[var(--color-brand-secondary)] hover:text-white transition">
              Đổi quà
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-[var(--color-brand-primary)] flex items-center gap-2 border-b border-gray-200 pb-2">
              <History size={18} className="text-[var(--color-brand-secondary)]" />
              Lịch sử gần đây
            </h4>
            <div className="text-sm bg-white p-3 rounded-lg border border-gray-100 flex justify-between">
              <div>
                <p className="font-semibold text-[var(--color-brand-primary)]">Đơn #1234</p>
                <p className="text-xs text-gray-500">2 ly Cà phê sữa đá</p>
              </div>
              <p className="font-bold text-[var(--color-brand-secondary)]">58,000 ₫</p>
            </div>
            <div className="text-sm bg-white p-3 rounded-lg border border-gray-100 flex justify-between">
              <div>
                <p className="font-semibold text-[var(--color-brand-primary)]">Mua Coffee Pass</p>
                <p className="text-xs text-gray-500">Gói Tháng VIP</p>
              </div>
              <p className="font-bold text-[var(--color-brand-secondary)]">250,000 ₫</p>
            </div>
          </div>
          
          <button className="w-full mt-auto bg-[var(--color-brand-primary)] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-brand-secondary)] transition shadow-md">
            <Gift size={20} />
            Tặng Voucher Đền bù
          </button>
        </div>
      </div>
    </div>
  );
}
