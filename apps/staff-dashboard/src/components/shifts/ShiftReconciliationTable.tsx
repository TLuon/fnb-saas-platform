import { Clock } from 'lucide-react';
import type { ShiftRecord } from '../../store/shiftStore';

interface ShiftReconciliationTableProps {
  shifts: ShiftRecord[];
}

export function ShiftReconciliationTable({ shifts }: ShiftReconciliationTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return '--';
    return new Date(isoString).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-[#D67D3E] text-white text-sm uppercase tracking-wide">
              <th className="p-4 font-semibold rounded-tl-3xl">Nhân viên / Chi nhánh</th>
              <th className="p-4 font-semibold">Thời gian ca</th>
              <th className="p-4 font-semibold text-right">Tiền mặt đầu ca</th>
              <th className="p-4 font-semibold text-right">Doanh thu TM</th>
              <th className="p-4 font-semibold text-right">Tiền phải có</th>
              <th className="p-4 font-semibold text-right">Tiền báo cáo</th>
              <th className="p-4 font-semibold text-right rounded-tr-3xl">Chênh lệch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {shifts.map((shift) => {
              const expectedCash = shift.startingCash + shift.revenueCash;
              const diff = shift.reportedCash !== null ? shift.reportedCash - expectedCash : 0;
              
              return (
                <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-gray-800">{shift.staffName}</p>
                    <p className="text-xs text-gray-500">{shift.branchName}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col text-gray-600 font-medium">
                      <span className="flex items-center gap-1"><Clock size={12} className="text-gray-400"/> {formatDate(shift.startTime)}</span>
                      <span className="flex items-center gap-1 text-gray-400">→ {shift.endTime ? formatDate(shift.endTime) : 'Đang mở'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right text-gray-600">{formatCurrency(shift.startingCash)}</td>
                  <td className="p-4 text-right font-medium text-gray-700">{formatCurrency(shift.revenueCash)}</td>
                  <td className="p-4 text-right font-bold text-[#543310]">{formatCurrency(expectedCash)}</td>
                  
                  {shift.status === 'CLOSED' ? (
                    <>
                      <td className="p-4 text-right font-bold text-gray-800">{formatCurrency(shift.reportedCash!)}</td>
                      <td className={`p-4 text-right font-black ${
                        diff > 0 ? 'text-[#237A57]' : diff < 0 ? 'text-[#B42318]' : 'text-gray-400'
                      }`}>
                        {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 text-right text-gray-400 italic">Chưa chốt ca</td>
                      <td className="p-4 text-right text-gray-400 italic">--</td>
                    </>
                  )}
                </tr>
              );
            })}
            {shifts.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400 font-medium">
                  Chưa có dữ liệu ca làm việc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
