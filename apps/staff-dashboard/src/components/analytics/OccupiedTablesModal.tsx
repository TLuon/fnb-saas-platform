import { useEffect, useState, useMemo } from 'react';
import {
  X,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Receipt,
  Clock,
  MapPin,
  LogOut,
  Armchair
} from 'lucide-react';
import { useAnalyticsStore, OccupiedTable } from '../../store/analyticsStore';

interface OccupiedTablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  onTableUpdated?: () => void;
}

export function OccupiedTablesModal({
  isOpen,
  onClose,
  branchId,
  onTableUpdated,
}: OccupiedTablesModalProps) {
  const {
    occupiedTablesList,
    tablesLoading,
    tablesError,
    fetchOccupiedTables,
    updateTableStatus
  } = useAnalyticsStore();

  const [activeTab, setActiveTab] = useState<'OCCUPIED' | 'CLEANING' | 'ALL'>('OCCUPIED');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchOccupiedTables(branchId, 'all');
      setSearchTerm('');
      setSuccessMessage(null);
      setActionError(null);
    }
  }, [isOpen, branchId, fetchOccupiedTables]);

  const handleRefresh = async () => {
    setSuccessMessage(null);
    setActionError(null);
    await fetchOccupiedTables(branchId, 'all');
  };

  const handleStatusChange = async (table: OccupiedTable, newStatus: 'AVAILABLE' | 'CLEANING') => {
    setUpdatingTableId(table.id);
    setActionError(null);
    try {
      await updateTableStatus(table.id, newStatus);
      const statusLabel = newStatus === 'AVAILABLE' ? 'Bàn trống (Sẵn sàng)' : 'Đang dọn dẹp';
      setSuccessMessage(`Đã cập nhật ${table.table_code} thành ${statusLabel}`);
      setTimeout(() => setSuccessMessage(null), 3500);
      onTableUpdated?.();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Không thể cập nhật trạng thái bàn');
    } finally {
      setUpdatingTableId(null);
    }
  };

  const formatCurrency = (val?: number) => {
    if (!val) return '0 đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const filteredTables = useMemo(() => {
    return occupiedTablesList.filter((table) => {
      // Tab filter
      if (activeTab === 'OCCUPIED' && table.status !== 'OCCUPIED') return false;
      if (activeTab === 'CLEANING' && table.status !== 'CLEANING') return false;

      // Search filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const codeMatch = table.table_code?.toLowerCase().includes(term);
      const floorMatch = table.floor_name?.toLowerCase().includes(term);
      const branchMatch = table.branch_name?.toLowerCase().includes(term);
      const orderMatch = table.order?.order_code?.toLowerCase().includes(term);
      return codeMatch || floorMatch || branchMatch || orderMatch;
    });
  }, [occupiedTablesList, activeTab, searchTerm]);

  const occupiedCount = occupiedTablesList.filter((t) => t.status === 'OCCUPIED').length;
  const cleaningCount = occupiedTablesList.filter((t) => t.status === 'CLEANING').length;
  const totalCount = occupiedTablesList.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-[#E8DED5] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E8DED5] bg-[#FAF7F3] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#D67D3E]/15 rounded-xl text-[#D67D3E]">
              <Armchair size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#543310]">Danh sách bàn đang phục vụ</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D67D3E] text-white">
                  {occupiedCount} đang dùng
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Xem bàn nào đang có khách và cập nhật trả bàn khi khách đã rời quán
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={tablesLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DED5] bg-white text-xs font-semibold text-[#543310] hover:bg-orange-50 hover:border-[#D67D3E] transition disabled:opacity-50"
              title="Làm mới danh sách"
            >
              <RefreshCw size={14} className={tablesLoading ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter bar & Search */}
        <div className="p-4 border-b border-[#E8DED5] bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center p-1 bg-gray-100 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('OCCUPIED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'OCCUPIED'
                  ? 'bg-white text-[#D67D3E] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#D67D3E]"></span>
              Đang dùng ({occupiedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CLEANING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'CLEANING'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Đang dọn ({cleaningCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'ALL'
                  ? 'bg-white text-[#543310] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tất cả ({totalCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo số bàn, tầng..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E8DED5] focus:outline-none focus:ring-1 focus:ring-[#D67D3E] focus:border-[#D67D3E]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Success or Error alerts */}
        {successMessage && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {actionError && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Content list */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {tablesLoading && occupiedTablesList.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-gray-400 gap-3">
              <RefreshCw size={28} className="animate-spin text-[#D67D3E]" />
              <p className="text-sm font-medium">Đang tải danh sách bàn...</p>
            </div>
          ) : tablesError ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <AlertCircle size={32} className="text-red-500" />
              <p className="font-semibold text-red-700 text-sm">{tablesError}</p>
              <button
                type="button"
                onClick={handleRefresh}
                className="px-4 py-1.5 bg-[#543310] text-white text-xs font-bold rounded-lg hover:bg-amber-900 transition"
              >
                Thử lại
              </button>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-base font-bold text-[#543310]">
                {activeTab === 'OCCUPIED'
                  ? 'Không có bàn nào đang phục vụ'
                  : activeTab === 'CLEANING'
                  ? 'Không có bàn nào cần dọn dẹp'
                  : 'Không tìm thấy bàn phù hợp'}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm">
                {activeTab === 'OCCUPIED'
                  ? 'Tất cả các bàn hiện đang trống hoặc chưa có khách ngồi.'
                  : 'Khi khách rời quán, nhân viên có thể đánh dấu dọn bàn hoặc trả bàn trống tại đây.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTables.map((table) => {
                const isOccupied = table.status === 'OCCUPIED';
                const isCleaning = table.status === 'CLEANING';
                const isAvailable = table.status === 'AVAILABLE';
                const isUpdating = updatingTableId === table.id;

                return (
                  <div
                    key={table.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      isOccupied
                        ? 'bg-white border-[#E8DED5] hover:border-[#D67D3E] shadow-sm'
                        : isCleaning
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-emerald-50/40 border-emerald-200'
                    }`}
                  >
                    <div>
                      {/* Table code & Status badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-[#543310]">
                              {table.table_code}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                              {table.capacity || 4} chỗ
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                            <MapPin size={12} className="text-[#D67D3E]" />
                            <span>
                              {table.branch_name || 'Chi nhánh'} • {table.floor_name || 'Tầng 1'}
                            </span>
                          </div>
                        </div>

                        {/* Status pill */}
                        {isOccupied && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse"></span>
                            Đang dùng
                          </span>
                        )}
                        {isCleaning && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Sparkles size={12} className="text-amber-600" />
                            Đang dọn
                          </span>
                        )}
                        {isAvailable && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Bàn trống
                          </span>
                        )}
                      </div>

                      {/* Order info if table has an active order */}
                      {table.order ? (
                        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-gray-700 flex items-center gap-1">
                              <Receipt size={13} className="text-[#D67D3E]" />
                              Đơn: {table.order.order_code}
                            </span>
                            <span className="text-[#543310] font-bold">
                              {formatCurrency(table.order.final_amount)}
                            </span>
                          </div>
                          {table.order.created_at && (
                            <div className="flex items-center gap-1 text-gray-500 text-[11px]">
                              <Clock size={11} />
                              <span>Bắt đầu lúc: {formatTime(table.order.created_at)}</span>
                            </div>
                          )}
                        </div>
                      ) : isOccupied ? (
                        <div className="p-2 rounded-lg bg-orange-50/50 border border-orange-100 text-[11px] text-orange-800">
                          Khách đang ngồi dùng (Chưa gán đơn cụ thể)
                        </div>
                      ) : null}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                      {isOccupied && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(table, 'AVAILABLE')}
                            disabled={isUpdating}
                            className="flex-1 py-2 px-3 rounded-lg bg-[#237A57] hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                            title="Khách đã rời quán, chuyển bàn về trạng thái Trống sẵn sàng đón khách mới"
                          >
                            {isUpdating ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <LogOut size={14} />
                            )}
                            Khách đã rời (Hết dùng)
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(table, 'CLEANING')}
                            disabled={isUpdating}
                            className="py-2 px-3 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold transition disabled:opacity-50"
                            title="Chuyển trạng thái sang Đang dọn dẹp"
                          >
                            Dọn bàn
                          </button>
                        </>
                      )}

                      {isCleaning && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(table, 'AVAILABLE')}
                          disabled={isUpdating}
                          className="w-full py-2 px-3 rounded-lg bg-[#237A57] hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isUpdating ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          Đã dọn xong (Sẵn sàng)
                        </button>
                      )}

                      {isAvailable && (
                        <div className="w-full py-1 text-center text-xs font-medium text-emerald-700">
                          ✓ Bàn đã sẵn sàng đón khách mới
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E8DED5] bg-[#FAF7F3] flex items-center justify-between text-xs text-gray-500">
          <span>
            Bấm <strong>"Khách đã rời (Hết dùng)"</strong> để giải phóng bàn ngay lập tức.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#543310] text-white font-bold rounded-lg hover:bg-amber-900 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
