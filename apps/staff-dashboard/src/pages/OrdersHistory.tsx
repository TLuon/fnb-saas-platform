import { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  RefreshCw, 
  Printer, 
  ChevronRight, 
  X, 
  ShoppingBag, 
  Store, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  DollarSign, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { apiClient, authStore } from '@fnb/utils';
import { useStore } from 'zustand';
import { useModal } from '../components/ModalProvider';

export interface OrderItemRecord {
  id: string;
  product_name?: string;
  name?: string;
  quantity: number;
  unit_price?: number;
  price?: number;
  modifiers?: Record<string, string> | any[];
  note?: string;
  kitchen_status?: string;
}

export interface OrderRecord {
  id: string;
  order_code?: string;
  order_number?: string;
  created_at: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;
  order_type: 'DINE_IN' | 'TAKEAWAY' | string;
  table_id?: string | null;
  table_name?: string;
  tables?: { table_code?: string; name?: string };
  final_amount?: number;
  total_amount?: number;
  subtotal?: number;
  discount_amount?: number;
  payment_method?: string;
  order_items?: OrderItemRecord[];
  items?: OrderItemRecord[];
}

export default function OrdersHistory() {
  const { showAlert } = useModal();
  const branchId = useStore(authStore, (state) => state.branchId);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Date Presets: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'
  const [dateFilter, setDateFilter] = useState<string>('TODAY');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('NEWEST');

  // Drawer state for viewing receipt details
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const query = branchId && branchId.includes('-')
        ? `/orders?branch_id=${branchId}&limit=100`
        : `/orders?limit=100`;
      
      const res: any = await apiClient.get(query);
      const list = res.data?.data || res.data || (Array.isArray(res) ? res : []);
      setOrders(list);
    } catch (err: any) {
      console.error('Lỗi khi tải lịch sử hóa đơn:', err);
      showAlert(err.response?.data?.message || err.message || 'Không thể tải lịch sử hóa đơn', 'error', 'Lỗi Tải Dữ Liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [branchId]);

  // Utility date checkers based on system time (máy tính)
  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const today = useMemo(() => new Date(), []);

  // Compute Statistics for TODAY based on computer local time
  const statsToday = useMemo(() => {
    const todayOrders = orders.filter(o => isSameDay(new Date(o.created_at), today));
    const completedOrders = todayOrders.filter(o => o.status === 'COMPLETED');
    
    const revenue = completedOrders.reduce((sum, o) => {
      const amt = Number(o.final_amount || o.total_amount || o.subtotal || 0);
      return sum + amt;
    }, 0);

    const inProgressCount = todayOrders.filter(o => o.status === 'IN_PROGRESS' || o.status === 'PENDING').length;
    const cancelledCount = todayOrders.filter(o => o.status === 'CANCELLED').length;
    const avgValue = completedOrders.length > 0 ? Math.round(revenue / completedOrders.length) : 0;

    return {
      totalCount: todayOrders.length,
      completedCount: completedOrders.length,
      revenue,
      inProgressCount,
      cancelledCount,
      avgValue
    };
  }, [orders, today]);

  // Filtered and sorted order list
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      
      // Date filter logic
      if (dateFilter === 'TODAY') {
        if (!isSameDay(orderDate, today)) return false;
      } else if (dateFilter === 'YESTERDAY') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (!isSameDay(orderDate, yesterday)) return false;
      } else if (dateFilter === 'LAST_7_DAYS') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (orderDate < sevenDaysAgo) return false;
      } else if (dateFilter === 'THIS_MONTH') {
        if (orderDate.getMonth() !== today.getMonth() || orderDate.getFullYear() !== today.getFullYear()) return false;
      } else if (dateFilter === 'CUSTOM') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (orderDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (orderDate > end) return false;
        }
      }

      // Status filter logic
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }

      // Order type filter logic
      if (typeFilter !== 'ALL' && order.order_type !== typeFilter) {
        return false;
      }

      // Search matching logic (Matches Code, Items, Table)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const code = (order.order_code || order.order_number || order.id || '').toLowerCase();
        const tableCode = (order.tables?.table_code || order.table_name || '').toLowerCase();
        
        const itemsList = order.order_items || order.items || [];
        const matchesDishName = itemsList.some((item: any) => {
          const dishName = (item.product_name || item.name || '').toLowerCase();
          const note = (item.note || '').toLowerCase();
          return dishName.includes(term) || note.includes(term);
        });

        if (!code.includes(term) && !tableCode.includes(term) && !matchesDishName) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      const amtA = Number(a.final_amount || a.total_amount || a.subtotal || 0);
      const amtB = Number(b.final_amount || b.total_amount || b.subtotal || 0);

      if (sortBy === 'NEWEST') return timeB - timeA;
      if (sortBy === 'OLDEST') return timeA - timeB;
      if (sortBy === 'AMOUNT_DESC') return amtB - amtA;
      if (sortBy === 'AMOUNT_ASC') return amtA - amtB;
      return 0;
    });
  }, [orders, dateFilter, customStartDate, customEndDate, statusFilter, typeFilter, searchTerm, sortBy, today]);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E2F3E5] text-[#237A57] border border-[#237A57]/20">
            <CheckCircle2 size={13} /> Đã hoàn thành
          </span>
        );
      case 'IN_PROGRESS':
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FED8B1] text-[#D67D3E] border border-[#D67D3E]/20">
            <Clock size={13} /> Đang xử lý
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEE4E2] text-[#B42318] border border-[#B42318]/20">
            <XCircle size={13} /> Đã hủy
          </span>
        );
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const handlePrintReceipt = (order: OrderRecord) => {
    const code = order.order_code || (order.id ? 'ORD-' + order.id.slice(0, 6).toUpperCase() : 'N/A');
    const items = order.order_items || order.items || [];
    const amount = Number(order.final_amount || order.total_amount || order.subtotal || 0);

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>In Hóa Đơn #${code}</title>
          <style>
            body { font-family: monospace; padding: 20px; font-size: 13px; color: #000; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; pb: 10px; }
            .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
            .item { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .divider { border-top: 1px dashed #000; margin: 12px 0; }
            .flex-between { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>HÓA ĐƠN BÁN HÀNG</h2>
            <p style="margin: 4px 0;">Mã đơn: #${code}</p>
            <p style="margin: 4px 0;">Nguyệt/Ngày: ${new Date(order.created_at).toLocaleString('vi-VN')}</p>
          </div>
          <div>
            ${items.map((it: any) => `
              <div class="item">
                <span>${it.quantity}x ${it.product_name || it.name || 'Món'}</span>
                <span>${new Intl.NumberFormat('vi-VN').format(Number(it.unit_price || it.price || 0) * Number(it.quantity || 1))}đ</span>
              </div>
            `).join('')}
          </div>
          <div class="divider"></div>
          <div class="flex-between bold" style="font-size: 15px;">
            <span>TỔNG CỘNG:</span>
            <span>${new Intl.NumberFormat('vi-VN').format(amount)}đ</span>
          </div>
          <p style="text-align: center; margin-top: 25px; font-size: 11px;">Cảm ơn quý khách & Hẹn gặp lại!</p>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F3] p-6 text-[#543310]">
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8DED5] pb-4">
        <div>
          <h1 className="text-3xl font-black font-serif text-[#543310] flex items-center gap-3">
            <Receipt className="text-[#D67D3E]" size={32} />
            Thống kê & Lịch sử Hóa đơn
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            Tra cứu, thống kê theo ngày và kiểm soát thông tin chi tiết hóa đơn bán hàng
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E8DED5] rounded-xl text-[#543310] font-bold text-sm shadow-sm hover:bg-[#FAF7F3] transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </header>

      {/* KPI Cards (Thống kê trong ngày theo máy tính) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#E8DED5] p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-gray-400">Hóa đơn hôm nay</p>
            <p className="text-2xl font-black text-[#543310] mt-1">{statsToday.totalCount} <span className="text-xs font-semibold text-gray-400">đơn</span></p>
            <p className="text-xs text-[#237A57] font-semibold mt-1">Đã hoàn thành: {statsToday.completedCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#D67D3E] flex items-center justify-center font-bold">
            <Receipt size={24} />
          </div>
        </div>

        <div className="bg-white border border-[#E8DED5] p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-gray-400">Doanh thu hôm nay</p>
            <p className="text-2xl font-black text-[#237A57] mt-1">{formatPrice(statsToday.revenue)}</p>
            <p className="text-xs text-gray-400 mt-1">Trung bình: {formatPrice(statsToday.avgValue)}/đơn</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-50 text-[#237A57] flex items-center justify-center font-bold">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white border border-[#E8DED5] p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-gray-400">Đang phục vụ / Xử lý</p>
            <p className="text-2xl font-black text-[#D67D3E] mt-1">{statsToday.inProgressCount} <span className="text-xs font-semibold text-gray-400">đơn</span></p>
            <p className="text-xs text-gray-400 mt-1">Đang thực hiện chế biến</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#D67D3E] flex items-center justify-center font-bold">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white border border-[#E8DED5] p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-gray-400">Đơn bị hủy hôm nay</p>
            <p className="text-2xl font-black text-[#B42318] mt-1">{statsToday.cancelledCount} <span className="text-xs font-semibold text-gray-400">đơn</span></p>
            <p className="text-xs text-gray-400 mt-1">Cần theo dõi nguyên nhân</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#B42318] flex items-center justify-center font-bold">
            <XCircle size={24} />
          </div>
        </div>
      </div>

      {/* Control Panel: Search & Filters */}
      <div className="bg-white border border-[#E8DED5] rounded-2xl p-5 mb-6 shadow-sm flex flex-col gap-4">
        {/* Search Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Mã hóa đơn (#ORD-...), Tên món ăn (vd: Cà phê), Số bàn..."
              className="w-full pl-11 pr-10 py-3 bg-[#FAF7F3] border border-[#E8DED5] rounded-xl text-sm font-semibold focus:outline-none focus:border-[#D67D3E] transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 bg-[#FAF7F3] p-1.5 rounded-xl border border-[#E8DED5] overflow-x-auto">
            {[
              { id: 'TODAY', label: 'Hôm nay' },
              { id: 'YESTERDAY', label: 'Hôm qua' },
              { id: 'LAST_7_DAYS', label: '7 ngày qua' },
              { id: 'THIS_MONTH', label: 'Tháng này' },
              { id: 'ALL', label: 'Tất cả' },
              { id: 'CUSTOM', label: 'Tùy chọn' },
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setDateFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  dateFilter === btn.id
                    ? 'bg-[#543310] text-white shadow-sm'
                    : 'text-[#6B625B] hover:text-[#543310]'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Picker Inputs if CUSTOM selected */}
        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-4 bg-orange-50/50 p-3 rounded-xl border border-[#FED8B1] animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#543310]">Từ ngày:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#E8DED5] rounded-lg text-xs font-semibold"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#543310]">Đến ngày:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#E8DED5] rounded-lg text-xs font-semibold"
              />
            </div>
          </div>
        )}

        {/* Filters & Sorting */}
        <div className="flex flex-wrap gap-4 items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#FAF7F3] border border-[#E8DED5] rounded-lg text-xs font-bold text-[#543310] focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="COMPLETED">Đã hoàn thành</option>
                <option value="IN_PROGRESS">Đang xử lý</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">Hình thức:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#FAF7F3] border border-[#E8DED5] rounded-lg text-xs font-bold text-[#543310] focus:outline-none"
              >
                <option value="ALL">Tất cả loại đơn</option>
                <option value="DINE_IN">Tại bàn</option>
                <option value="TAKEAWAY">Mang đi / Online</option>
              </select>
            </div>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-[#FAF7F3] border border-[#E8DED5] rounded-lg text-xs font-bold text-[#543310] focus:outline-none"
            >
              <option value="NEWEST">Thời gian: Mới nhất</option>
              <option value="OLDEST">Thời gian: Cũ nhất</option>
              <option value="AMOUNT_DESC">Giá trị: Cao nhất</option>
              <option value="AMOUNT_ASC">Giá trị: Thấp nhất</option>
            </select>
          </div>
        </div>

        {/* Dish Search Indicator Alert */}
        {searchTerm.trim() && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D67D3E] bg-orange-50 px-3 py-2 rounded-lg border border-[#FED8B1]">
            <AlertCircle size={14} />
            <span>Đang tìm kiếm theo từ khóa <strong>"{searchTerm}"</strong> (Tìm trong mã đơn, tên món ăn, số bàn). Tìm thấy <strong>{filteredOrders.length}</strong> hóa đơn phù hợp.</span>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#E8DED5] rounded-2xl shadow-sm overflow-hidden flex-1">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="animate-spin mx-auto mb-3" size={32} />
            <p className="font-bold text-sm">Đang tải danh sách hóa đơn...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileText className="mx-auto mb-3 opacity-30" size={48} />
            <p className="font-bold text-base text-[#543310]">Không tìm thấy hóa đơn nào</p>
            <p className="text-xs text-gray-400 mt-1">Thử điều chỉnh bộ lọc thời gian hoặc từ khóa tìm kiếm</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF7F3] border-b border-[#E8DED5] text-[11px] font-black uppercase text-gray-500 tracking-wider">
                  <th className="py-3.5 px-4">Mã Hóa Đơn</th>
                  <th className="py-3.5 px-4">Thời Gian Khởi Tạo</th>
                  <th className="py-3.5 px-4">Loại Đơn & Bàn</th>
                  <th className="py-3.5 px-4">Món Đã Đặt</th>
                  <th className="py-3.5 px-4">Tổng Thanh Toán</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-center">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredOrders.map(order => {
                  const orderCode = order.order_code || (order.id ? 'ORD-' + order.id.slice(0, 6).toUpperCase() : 'ORD-UNKNOWN');
                  const items = order.order_items || order.items || [];
                  const totalAmt = Number(order.final_amount || order.total_amount || order.subtotal || 0);
                  const isDineIn = order.order_type === 'DINE_IN';
                  const tableName = order.tables?.table_code || order.tables?.name || order.table_name;
                  return (
                    <tr 
                      key={order.id} 
                      className="hover:bg-[#FAF7F3]/70 transition-colors cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="py-3.5 px-4 font-black text-[#543310]">
                        #{orderCode}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-semibold text-gray-600">
                        {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(order.created_at).toLocaleDateString('vi-VN')}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                          isDineIn ? 'bg-amber-50 text-[#543310] border border-amber-200' : 'bg-orange-50 text-[#D67D3E] border border-orange-200'
                        }`}>
                          {isDineIn ? <Store size={12} /> : <ShoppingBag size={12} />}
                          {isDineIn ? (tableName ? `Bàn ${tableName}` : 'Tại bàn') : 'Mang đi'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="max-w-xs truncate text-xs font-semibold text-gray-700">
                          {items.length > 0 ? (
                            items.map((it: any) => `${it.quantity}x ${it.product_name || it.name || 'Món'}`).join(', ')
                          ) : (
                            <span className="text-gray-400 italic">Không có chi tiết món</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#D67D3E]">
                        {formatPrice(totalAmt)}
                        {order.payment_method && (
                          <span className="block text-[10px] font-semibold text-gray-400 uppercase mt-0.5">
                            {order.payment_method}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(order.status)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="p-1.5 bg-gray-100 hover:bg-[#D67D3E] hover:text-white text-gray-600 rounded-lg transition"
                          title="Xem chi tiết hóa đơn"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side-Drawer / Modal for Viewing Order Receipt Details */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-[#E8DED5]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E8DED5] flex justify-between items-center bg-[#FAF7F3]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#D67D3E]">Chi tiết hóa đơn</span>
                <h3 className="text-2xl font-black text-[#543310] mt-0.5">
                  #{selectedOrder.order_code || (selectedOrder.id ? 'ORD-' + selectedOrder.id.slice(0, 6).toUpperCase() : '')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Order Status & Info Card */}
              <div className="bg-[#FAF7F3] border border-[#E8DED5] p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500">Trạng thái:</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-500">Thời gian tạo:</span>
                  <span className="font-semibold text-[#543310]">{new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-500">Hình thức phục vụ:</span>
                  <span className="font-bold text-[#D67D3E] uppercase">
                    {selectedOrder.order_type === 'DINE_IN' 
                      ? (selectedOrder.tables?.table_code || selectedOrder.table_name ? `Tại bàn (${selectedOrder.tables?.table_code || selectedOrder.table_name})` : 'Tại bàn')
                      : 'Mang đi / Delivery'}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Danh sách món ăn ({ (selectedOrder.order_items || selectedOrder.items || []).length })</h4>
                <div className="space-y-2">
                  {(selectedOrder.order_items || selectedOrder.items || []).map((it: any, idx: number) => {
                    const price = Number(it.unit_price || it.price || 0);
                    const qty = Number(it.quantity || 1);
                    const itemTotal = price * qty;

                    return (
                      <div key={it.id || idx} className="p-3 bg-white border border-[#E8DED5] rounded-xl flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-[#543310]">{qty}x {it.product_name || it.name || 'Món'}</p>
                          {it.modifiers && Object.keys(it.modifiers).length > 0 && (
                            <p className="text-xs text-gray-500 font-semibold mt-0.5">
                              {typeof it.modifiers === 'object' ? Object.values(it.modifiers).join(', ') : String(it.modifiers)}
                            </p>
                          )}
                          {it.note && (
                            <p className="text-xs text-[#D67D3E] font-bold italic mt-0.5">Ghi chú: {it.note}</p>
                          )}
                        </div>
                        <p className="font-bold text-sm text-[#543310]">{formatPrice(itemTotal)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="border-t border-[#E8DED5] pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Tạm tính:</span>
                  <span>{formatPrice(Number(selectedOrder.subtotal || selectedOrder.total_amount || selectedOrder.final_amount || 0))}</span>
                </div>
                {Number(selectedOrder.discount_amount) > 0 && (
                  <div className="flex justify-between text-[#237A57] font-semibold">
                    <span>Chiết khấu / Giảm giá:</span>
                    <span>-{formatPrice(Number(selectedOrder.discount_amount))}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-black text-[#543310] pt-2 border-t border-gray-100">
                  <span>TỔNG THANH TOÁN:</span>
                  <span className="text-[#D67D3E]">{formatPrice(Number(selectedOrder.final_amount || selectedOrder.total_amount || selectedOrder.subtotal || 0))}</span>
                </div>
                {selectedOrder.payment_method && (
                  <div className="flex justify-between text-xs text-gray-500 font-semibold pt-1">
                    <span>Phương thức thanh toán:</span>
                    <span className="uppercase text-[#543310]">{selectedOrder.payment_method}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-[#E8DED5] bg-[#FAF7F3] flex gap-3">
              <button
                onClick={() => handlePrintReceipt(selectedOrder)}
                className="flex-1 py-3 bg-[#543310] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-black transition"
              >
                <Printer size={18} />
                In lại Hóa đơn
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-3 bg-white border border-[#E8DED5] text-[#543310] rounded-xl font-bold hover:bg-gray-100 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
