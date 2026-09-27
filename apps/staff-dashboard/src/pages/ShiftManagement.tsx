import React, { Component, useEffect, useMemo, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { authStore } from '@fnb/utils';
import { useStore } from 'zustand';
import { useShiftStore, type ShiftRecord } from '../store/shiftStore';
import { useModal } from '../components/ModalProvider';

const DEFAULT_BRANCH_ID = '22222222-2222-2222-2222-222222222222';

type ErrorBoundaryState = {
  hasError: boolean;
};

class ShiftPageErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Shift page crashed', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8">
          <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4">
            Không thể hiển thị trang ca làm việc. Vui lòng tải lại trang hoặc thử lại sau.
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('vi-VN');
}

function ShiftHistory({ shifts }: { shifts: ShiftRecord[] }) {
  if (shifts.length === 0) {
    return (
      <div className="bg-white border border-[#E8DED5] rounded-xl p-6 text-center text-gray-500">
        Chưa có ca làm việc
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E8DED5] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[#543310] text-white">
            <tr>
              <th className="p-3 text-left font-semibold">Nhân viên</th>
              <th className="p-3 text-left font-semibold">Bắt đầu</th>
              <th className="p-3 text-left font-semibold">Kết thúc</th>
              <th className="p-3 text-right font-semibold">Đầu ca</th>
              <th className="p-3 text-right font-semibold">Cuối ca</th>
              <th className="p-3 text-center font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shifts.map((shift) => (
              <tr key={shift.id} className="hover:bg-orange-50/50">
                <td className="p-3">
                  <div className="font-bold text-[#543310]">{shift.staffName}</div>
                  <div className="text-xs text-gray-500">{shift.branchName}</div>
                </td>
                <td className="p-3 text-gray-700">{formatDate(shift.startTime)}</td>
                <td className="p-3 text-gray-700">{formatDate(shift.endTime)}</td>
                <td className="p-3 text-right text-gray-700">{formatCurrency(shift.startingCash)}</td>
                <td className="p-3 text-right text-gray-700">
                  {shift.reportedCash === null ? '--' : formatCurrency(shift.reportedCash)}
                </td>
                <td className="p-3 text-center">
                  <span
                    className={`inline-flex min-w-20 justify-center rounded-full px-3 py-1 text-xs font-bold ${
                      shift.status === 'OPEN'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {shift.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShiftManagementContent() {
  const profile = useStore(authStore, (state) => state.profile);
  const authBranchId = useStore(authStore, (state) => state.branchId);
  const {
    shifts,
    currentShift,
    loading,
    error,
    fetchCurrentShift,
    fetchShifts,
    openShift,
    closeShift,
  } = useShiftStore();

  const [initialCash, setInitialCash] = useState(0);
  const [finalCash, setFinalCash] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branchId = useMemo(
    () => profile?.branch_id || authBranchId || localStorage.getItem('branchId') || DEFAULT_BRANCH_ID,
    [authBranchId, profile?.branch_id],
  );

  const activeShift = currentShift?.status === 'OPEN' ? currentShift : null;
  const expectedCash = activeShift?.expectedCash ?? activeShift?.startingCash ?? 0;

  const { showAlert } = useModal();

  useEffect(() => {
    void fetchCurrentShift(branchId);
    void fetchShifts(branchId);
  }, [branchId, fetchCurrentShift, fetchShifts]);

  useEffect(() => {
    if (activeShift) {
      setFinalCash(expectedCash);
    }
  }, [activeShift, expectedCash]);

  const handleOpenShift = async () => {
    setIsSubmitting(true);
    try {
      await openShift(branchId, initialCash);
      await fetchShifts(branchId);
      showAlert('Đã mở ca làm việc thành công!', 'success', 'Thành Công');
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Không thể mở ca', 'error', 'Lỗi Mở Ca');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;

    setIsSubmitting(true);
    try {
      await closeShift(activeShift.id, finalCash);
      await fetchCurrentShift(branchId);
      await fetchShifts(branchId);
      showAlert('Đã kết thúc ca làm việc thành công!', 'success', 'Thành Công');
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Không thể đóng ca', 'error', 'Lỗi Đóng Ca');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F3] p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-black text-[#543310]">Quản lý Ca làm việc</h1>
          <p className="text-gray-500 mt-1">Kiểm soát tiền mặt và bàn giao ca</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="bg-white p-6 rounded-xl shadow-sm border border-[#E8DED5]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#543310]">Ca hiện tại</h2>
              <p className="text-sm text-gray-500">Chi nhánh: {branchId}</p>
            </div>
            {loading && <span className="text-sm font-medium text-gray-500">Đang tải...</span>}
          </div>

          {!activeShift ? (
            <div className="space-y-6">
              <div className="bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-100 text-sm">
                Chưa có ca làm việc. Vui lòng kiểm đếm tiền mặt ban đầu và mở ca.
              </div>

              <div>
                <label className="block font-bold text-[#543310] mb-2">Tiền mặt đầu ca (VNĐ)</label>
                <input
                  type="number"
                  min="0"
                  value={initialCash}
                  onChange={(event) => setInitialCash(Number(event.target.value))}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 text-lg focus:outline-none focus:border-[#D67D3E]"
                  placeholder="Ví dụ: 2,000,000"
                />
              </div>

              <button
                onClick={handleOpenShift}
                disabled={isSubmitting || loading}
                className="w-full bg-[#D67D3E] text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-orange-700 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Mở Ca Mới'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-100 text-sm">
                <p className="font-bold mb-1">Ca làm việc đang mở</p>
                <p>Bắt đầu lúc: {formatDate(activeShift.startTime)}</p>
                <p>
                  Tiền mặt đầu ca:{' '}
                  <span className="font-bold">{formatCurrency(activeShift.startingCash)}</span>
                </p>
                <p className="mt-2 pt-2 border-t border-green-200">
                  Hệ thống tính toán:{' '}
                  <span className="font-black text-lg">{formatCurrency(expectedCash)}</span>
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#543310] mb-2">
                  Tiền mặt thực tế đếm được (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  value={finalCash}
                  onChange={(event) => setFinalCash(Number(event.target.value))}
                  className={`w-full border-2 rounded-xl p-3 text-lg focus:outline-none ${
                    finalCash !== expectedCash
                      ? 'border-red-400 bg-red-50 text-red-900 focus:border-red-500'
                      : 'border-gray-200 focus:border-[#D67D3E]'
                  }`}
                  placeholder="Nhập số tiền kiểm đếm được..."
                />
                {finalCash !== expectedCash && (
                  <p className="text-red-500 text-sm mt-2 font-bold">
                    Chênh lệch: {formatCurrency(finalCash - expectedCash)}
                  </p>
                )}
              </div>

              <button
                onClick={handleCloseShift}
                disabled={isSubmitting || loading}
                className="w-full bg-[#543310] text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-black disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Chốt & Đóng Ca'}
              </button>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-black text-[#543310]">Lịch sử ca</h2>
            <p className="text-sm text-gray-500">Danh sách ca mở và đã chốt từ API.</p>
          </div>
          <ShiftHistory shifts={shifts} />
        </section>
      </div>
    </div>
  );
}

const ShiftManagement: React.FC = () => (
  <ShiftPageErrorBoundary>
    <ShiftManagementContent />
  </ShiftPageErrorBoundary>
);

export default ShiftManagement;
