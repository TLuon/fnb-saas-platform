import { useMemo, useState } from 'react';
import { AlertCircle, ChevronRight, Clock3, ReceiptText, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import type { RevenueOrder } from '../../store/analyticsStore';

interface RevenueOrdersPanelProps {
  orders: RevenueOrder[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  registerSection: (element: HTMLElement | null) => void;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', maximumFractionDigits: 0,
}).format(value);

const formatDateTime = (value: string) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : 'Không rõ thời gian';

const paymentNames: Record<string, string> = {
  CASH: 'Tiền mặt', VIETQR: 'Chuyển khoản / VietQR', WALLET: 'Ví F&B',
  COFFEE_PASS: 'Coffee Pass', CARD: 'Thẻ',
};

export function RevenueOrdersPanel({ orders, loading, error, onRetry, registerSection }: RevenueOrdersPanelProps) {
  const [selectedOrder, setSelectedOrder] = useState<RevenueOrder | null>(null);
  const [query, setQuery] = useState('');

  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi-VN');
    if (!keyword) return orders;
    return orders.filter((order) => [
      order.orderCode, order.customerName, order.customerPhone, order.branchName, order.tableCode,
    ].some((value) => value?.toLocaleLowerCase('vi-VN').includes(keyword)));
  }, [orders, query]);

  return (
    <section ref={registerSection} className="scroll-mt-6 overflow-hidden rounded-lg border border-[#E3D7CB] bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#EDE5DE] px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText size={20} className="text-[#B85F27]" />
            <h3 className="text-xl font-bold text-[#543310]">Sổ giao dịch</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">{orders.length} đơn đã hoàn tất trong kỳ đang chọn</p>
        </div>
        <label className="flex h-10 w-full items-center gap-2 rounded-md border border-[#DED5CC] bg-[#FCFAF8] px-3 md:w-80">
          <Search size={16} className="text-gray-400" />
          <span className="sr-only">Tìm giao dịch</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Mã đơn, khách hàng, số bàn..." />
        </label>
      </div>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center text-sm text-gray-500">Đang tải giao dịch...</div>
      ) : error ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-5 text-center">
          <AlertCircle size={26} className="text-red-600" />
          <p className="text-sm font-semibold text-gray-700">{error}</p>
          <button type="button" onClick={onRetry} className="rounded-md bg-[#5A310F] px-4 py-2 text-sm font-semibold text-white">Tải lại</button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
          <ShoppingBag size={30} className="text-[#C8BDB3]" />
          <p className="mt-3 font-semibold text-gray-700">Không có giao dịch phù hợp</p>
          <p className="mt-1 text-sm text-gray-400">Đổi từ khóa, chi nhánh hoặc khoảng thời gian để xem đơn.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#FAF7F4] text-left text-xs font-bold uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Đơn hàng</th><th className="px-5 py-3">Khách hàng</th>
                <th className="px-5 py-3">Thời gian</th><th className="px-5 py-3">Hình thức</th>
                <th className="px-5 py-3 text-right">Doanh thu</th><th className="w-12 px-3 py-3"><span className="sr-only">Chi tiết</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE4]">
              {filteredOrders.map((order) => (
                <tr key={order.id} onClick={() => setSelectedOrder(order)} className="cursor-pointer hover:bg-[#FFF9F3]" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedOrder(order); }}>
                  <td className="px-5 py-4"><p className="font-bold text-[#543310]">{order.orderCode}</p><p className="mt-1 text-xs text-gray-400">{order.branchName}</p></td>
                  <td className="px-5 py-4"><p className="font-semibold text-gray-800">{order.customerName}</p><p className="mt-1 text-xs text-gray-400">{order.customerPhone ?? order.customerEmail ?? 'Không có thông tin liên hệ'}</p></td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-600">{formatDateTime(order.createdAt)}</td>
                  <td className="px-5 py-4"><span className="inline-flex rounded-full bg-[#F5E8DC] px-2.5 py-1 text-xs font-semibold text-[#7B421A]">{order.orderType === 'TAKEAWAY' ? 'Mang đi' : order.tableCode ? `Tại bàn ${order.tableCode}` : 'Tại quán'}</span></td>
                  <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-[#543310]">{formatCurrency(order.finalAmount)}</td>
                  <td className="px-3 py-4"><ChevronRight size={18} className="text-gray-400" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true" aria-label={`Chi tiết đơn ${selectedOrder.orderCode}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedOrder(null); }}>
          <div className="h-full w-full overflow-y-auto bg-white shadow-2xl sm:max-w-lg">
            <div className="sticky top-0 flex items-start justify-between border-b border-[#E9E0D8] bg-white px-6 py-5">
              <div><p className="text-xs font-bold uppercase text-[#B85F27]">Chi tiết giao dịch</p><h4 className="mt-1 text-2xl font-black text-[#543310]">{selectedOrder.orderCode}</h4></div>
              <button type="button" onClick={() => setSelectedOrder(null)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" aria-label="Đóng chi tiết"><X size={20} /></button>
            </div>
            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-[#FAF7F4] p-3"><Clock3 size={17} className="text-[#B85F27]" /><p className="mt-2 text-xs text-gray-500">Thời gian</p><p className="mt-1 text-sm font-bold text-gray-800">{formatDateTime(selectedOrder.createdAt)}</p></div>
                <div className="rounded-md bg-[#FAF7F4] p-3"><ShoppingBag size={17} className="text-[#B85F27]" /><p className="mt-2 text-xs text-gray-500">Phục vụ</p><p className="mt-1 text-sm font-bold text-gray-800">{selectedOrder.orderType === 'TAKEAWAY' ? 'Mang đi' : selectedOrder.tableCode ? `Bàn ${selectedOrder.tableCode}` : 'Tại quán'}</p></div>
              </div>
              <div className="border-b border-[#EEE6DF] pb-5"><div className="flex items-center gap-2 text-sm font-bold text-gray-800"><UserRound size={17} /> Khách hàng</div><p className="mt-3 font-semibold text-[#543310]">{selectedOrder.customerName}</p><p className="mt-1 text-sm text-gray-500">{selectedOrder.customerPhone ?? selectedOrder.customerEmail ?? 'Khách không để lại thông tin liên hệ'}</p></div>
              <div><h5 className="text-sm font-bold text-gray-800">Món đã mua</h5><div className="mt-3 divide-y divide-[#EEE6DF]">{selectedOrder.items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 py-3"><div><p className="font-semibold text-gray-800">{item.quantity} × {item.productName}</p></div><p className="whitespace-nowrap font-semibold text-gray-700">{formatCurrency(item.quantity * item.unitPrice)}</p></div>)}</div></div>
              <div className="space-y-2 rounded-md bg-[#FAF7F4] p-4 text-sm"><div className="flex justify-between"><span className="text-gray-500">Tạm tính</span><span>{formatCurrency(selectedOrder.subtotal)}</span></div><div className="flex justify-between"><span className="text-gray-500">Giảm giá</span><span>-{formatCurrency(selectedOrder.discountAmount)}</span></div><div className="flex justify-between"><span className="text-gray-500">Thanh toán</span><span>{selectedOrder.paymentMethod ? paymentNames[selectedOrder.paymentMethod] ?? selectedOrder.paymentMethod : 'Chưa ghi nhận'}</span></div><div className="flex justify-between border-t border-[#DED5CC] pt-3 text-base font-black text-[#543310]"><span>Thành tiền</span><span>{formatCurrency(selectedOrder.finalAmount)}</span></div></div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
