import { useState, useEffect, useCallback } from 'react';
import { Search, Star, Gift, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

type Segment = 'VIP' | 'LOYAL' | 'CHURN_RISK' | 'NEW';

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  rfm: string;
  points: number;
  spent: number;
  total_visits?: number;
  first_visit_at?: string;
  last_visit_at?: string;
  dietary_notes?: string;
}

export default function CDP() {
  const [segment, setSegment] = useState<Segment>('VIP');
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [customer360, setCustomer360] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherDiscount, setVoucherDiscount] = useState('20');
  const [voucherSuccessMsg, setVoucherSuccessMsg] = useState('');
  const [voucherErrorMsg, setVoucherErrorMsg] = useState('');

  const token = useAuthStore((state) => state.accessToken);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/cdp/customers?segment=${segment}`, { headers });
      if (res.ok) {
        const resJson = await res.json();
        const payload = resJson?.data ?? resJson;
        const list = Array.isArray(payload) ? payload : [];
        const mapped: CustomerItem[] = list.map((c: any) => ({
          id: c.id,
          name: c.full_name || 'Khách hàng',
          phone: c.phone || 'Chưa có SĐT',
          rfm: c.membership_tier || segment,
          points: c.loyalty_points || 0,
          spent: Number(c.total_spent || 0),
          total_visits: c.total_visits,
          first_visit_at: c.first_visit_at,
          last_visit_at: c.last_visit_at,
          dietary_notes: c.dietary_notes,
        }));
        setCustomers(mapped);
        if (mapped.length > 0) {
          setSelectedCustomer(mapped[0]);
        } else {
          setSelectedCustomer(null);
          setCustomer360(null);
        }
      } else {
        setCustomers([]);
        setSelectedCustomer(null);
        setCustomer360(null);
      }
    } catch (e) {
      console.error('Lỗi khi tải khách hàng CDP:', e);
      setCustomers([]);
      setSelectedCustomer(null);
      setCustomer360(null);
    } finally {
      setLoading(false);
    }
  }, [segment, token]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Load customer 360 when selected
  useEffect(() => {
    if (!selectedCustomer?.id) return;
    async function load360() {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${baseUrl}/cdp/customers/${selectedCustomer!.id}/360`, { headers });
        if (res.ok) {
          const resJson = await res.json();
          setCustomer360(resJson?.data ?? resJson);
        }
      } catch (e) {
        console.warn('Lỗi khi tải thông tin 360:', e);
      }
    }
    load360();
  }, [selectedCustomer?.id, token]);

  const handleCreateVoucher = async () => {
    if (!selectedCustomer?.id) return;
    setVoucherSuccessMsg('');
    setVoucherErrorMsg('');

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/cdp/customers/${selectedCustomer.id}/vouchers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          discount_percent: Number(voucherDiscount) || 10,
        }),
      });

      if (res.ok) {
        setVoucherSuccessMsg('Đã tạo voucher thành công cho khách hàng!');
        setTimeout(() => {
          setShowVoucherModal(false);
          setVoucherSuccessMsg('');
        }, 2000);
      } else {
        const errJson = await res.json().catch(() => null);
        setVoucherErrorMsg(errJson?.error?.message || errJson?.message || 'Không thể tạo voucher');
      }
    } catch (err: any) {
      setVoucherErrorMsg(err?.message || 'Lỗi mạng khi gửi yêu cầu tạo voucher');
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">
            Hồ sơ Khách hàng
          </h2>
          <p className="text-gray-500 mt-2">Quản lý và phân khúc khách hàng theo chuẩn RFM</p>
        </div>
      </div>

      {/* Segment Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex items-center bg-white px-4 py-2 rounded-xl border border-gray-200 flex-1">
          <Search size={20} className="text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full outline-none text-sm"
          />
        </div>

        <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm gap-1 overflow-x-auto">
          {(
            [
              { key: 'VIP', label: 'VIP' },
              { key: 'LOYAL', label: 'Thân thiết (LOYAL)' },
              { key: 'NEW', label: 'Mới (NEW)' },
              { key: 'CHURN_RISK', label: 'Nguy cơ rời bỏ' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setSegment(t.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                segment === t.key
                  ? 'bg-[var(--color-brand-primary)] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-brand-secondary)] text-white">
                <th className="p-4 font-semibold">Khách hàng</th>
                <th className="p-4 font-semibold">Phân khúc</th>
                <th className="p-4 font-semibold text-right">Điểm tích lũy</th>
                <th className="p-4 font-semibold text-right">Tổng chi tiêu</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    Đang tải dữ liệu phân khúc {segment}...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    Không có khách hàng nào thuộc phân khúc {segment}.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`border-b border-gray-50 hover:bg-[var(--color-brand-accent)]/20 transition cursor-pointer ${
                      selectedCustomer?.id === c.id ? 'bg-[var(--color-brand-accent)]/30' : ''
                    }`}
                  >
                    <td className="p-4">
                      <p className="font-bold text-[var(--color-brand-primary)]">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.phone}</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          segment === 'VIP'
                            ? 'bg-[var(--color-brand-primary)] text-white'
                            : segment === 'LOYAL'
                              ? 'bg-[var(--color-brand-accent)] text-[var(--color-brand-primary)]'
                              : segment === 'NEW'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {segment}
                      </span>
                    </td>
                    <td className="p-4 text-right font-semibold text-[var(--color-brand-secondary)]">
                      {c.points} điểm
                    </td>
                    <td className="p-4 text-right font-semibold text-[var(--color-brand-primary)]">
                      {c.spent.toLocaleString('vi-VN')} ₫
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 360 Detail Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col gap-6 relative overflow-hidden">
          {selectedCustomer ? (
            <>
              <div className="text-center relative z-10">
                <div className="w-20 h-20 bg-[var(--color-brand-secondary)] rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-black font-serif mb-4 shadow-md">
                  <span>{selectedCustomer.name.charAt(0)}</span>
                </div>
                <h3 className="text-2xl font-black font-serif text-[var(--color-brand-primary)]">
                  {selectedCustomer.name}
                </h3>
                <p className="text-gray-500 text-sm mt-0.5">{selectedCustomer.phone}</p>
                <span className="inline-block mt-3 px-4 py-1 bg-[var(--color-brand-primary)] text-white rounded-full text-xs font-bold tracking-wider uppercase">
                  {selectedCustomer.rfm}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center border border-gray-100">
                <div className="flex items-center gap-3">
                  <Star className="text-[var(--color-brand-secondary)]" size={24} />
                  <div>
                    <p className="text-xs text-gray-500">Điểm tích lũy</p>
                    <p className="font-bold text-[var(--color-brand-primary)]">
                      {(customer360?.loyalty_points ?? selectedCustomer.points).toLocaleString()} điểm
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Số lượt ghé</p>
                  <p className="font-bold text-[var(--color-brand-primary)]">
                    {customer360?.total_visits ?? selectedCustomer.total_visits ?? 0} lần
                  </p>
                </div>
              </div>

              {selectedCustomer.dietary_notes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <span className="font-bold">Lưu ý món:</span> {selectedCustomer.dietary_notes}
                </div>
              )}

              <div className="space-y-2 text-xs text-gray-500">
                <p className="flex justify-between">
                  <span>Lần đầu ghé:</span>
                  <span className="font-medium text-gray-700">
                    {customer360?.first_visit_at
                      ? new Date(customer360.first_visit_at).toLocaleDateString('vi-VN')
                      : 'Chưa có'}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>Lần gần nhất:</span>
                  <span className="font-medium text-gray-700">
                    {customer360?.last_visit_at
                      ? new Date(customer360.last_visit_at).toLocaleDateString('vi-VN')
                      : 'Chưa có'}
                  </span>
                </p>
              </div>

              <button
                onClick={() => setShowVoucherModal(true)}
                className="w-full mt-auto bg-[var(--color-brand-primary)] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-brand-secondary)] transition shadow-md text-sm"
              >
                <Gift size={18} />
                Tặng Voucher Cho Khách
              </button>
            </>
          ) : (
            <div className="py-20 text-center text-gray-400">
              Chọn một khách hàng trong bảng để xem thông tin chi tiết.
            </div>
          )}
        </div>
      </div>

      {/* Voucher Modal */}
      {showVoucherModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowVoucherModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black font-serif text-[var(--color-brand-primary)] mb-2">
              Tặng Voucher: {selectedCustomer.name}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Voucher sẽ được lưu vào bảng customer_vouchers theo RLS quy định.
            </p>

            {voucherSuccessMsg && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl flex items-center gap-2 text-xs">
                <CheckCircle size={16} />
                <span>{voucherSuccessMsg}</span>
              </div>
            )}

            {voucherErrorMsg && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle size={16} />
                <span>{voucherErrorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mức giảm giá (%)
                </label>
                <select
                  value={voucherDiscount}
                  onChange={(e) => setVoucherDiscount(e.target.value)}
                  className="w-full border border-gray-200 p-2.5 rounded-xl outline-none text-sm"
                >
                  <option value="10">Giảm 10%</option>
                  <option value="15">Giảm 15%</option>
                  <option value="20">Giảm 20%</option>
                  <option value="30">Giảm 30%</option>
                  <option value="50">Giảm 50%</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowVoucherModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateVoucher}
                  className="flex-1 py-2.5 bg-[var(--color-brand-primary)] text-white rounded-xl font-bold hover:bg-[var(--color-brand-secondary)] transition text-sm"
                >
                  Xác nhận tặng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
