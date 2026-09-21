import React, { useState, useEffect } from 'react';
import { apiClient } from '@fnb/utils';

interface Shift {
  id: string;
  start_time: string;
  end_time?: string;
  initial_cash: number;
  expected_cash?: number; // Added from API
  final_cash?: number;
  status: 'OPEN' | 'CLOSED';
}

const ShiftManagement: React.FC = () => {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [initialCash, setInitialCash] = useState<number>(0);
  const [finalCash, setFinalCash] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const branchId = localStorage.getItem('branchId') || 'branch-1';



  useEffect(() => {
    // Fetch current shift
    apiClient.get(`/api/v1/shifts/current?branch_id=${branchId}`).then((res: any) => {
        const shiftData = res.data?.data || res.data || res;
        if (shiftData) {
          setCurrentShift(shiftData);
          // Set default final cash to expected cash if available
          if (shiftData.expected_cash) {
            setFinalCash(shiftData.expected_cash);
          }
        }
      })
      .catch(() => {
        console.warn('No active shift found');
      });
  }, [branchId]);

  const handleOpenShift = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/api/v1/shifts/open', { initial_cash: initialCash, branch_id: branchId });
      setCurrentShift(res.data?.data || res.data || res);
      alert('Đã mở ca thành công!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể mở ca');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseShift = async () => {
    if (!currentShift) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/api/v1/shifts/${currentShift.id}/close`, { final_cash: finalCash });
      setCurrentShift(res.data?.data || res.data || res); // Should return CLOSED shift
      alert('Đã đóng ca thành công!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể đóng ca');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FAF7F3] p-8 items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E8DED5] w-full max-w-md">
        <h1 className="text-3xl font-black text-[#543310] mb-2 text-center">Quản lý Ca làm việc</h1>
        <p className="text-gray-500 text-center mb-8">Kiểm soát tiền mặt và bàn giao ca</p>

        {!currentShift || currentShift.status === 'CLOSED' ? (
          // Open Shift Form
          <div className="space-y-6">
            <div className="bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-100 text-sm">
              Hiện tại chưa có ca làm việc nào được mở. Vui lòng kiểm đếm tiền mặt ban đầu và mở ca.
            </div>
            
            <div>
              <label className="block font-bold text-[#543310] mb-2">Tiền mặt đầu ca (VNĐ)</label>
              <input 
                type="number" 
                value={initialCash}
                onChange={e => setInitialCash(Number(e.target.value))}
                className="w-full border-2 border-gray-200 rounded-xl p-3 text-lg focus:outline-none focus:border-[#D67D3E]"
                placeholder="Ví dụ: 2,000,000"
              />
            </div>

            <button 
              onClick={handleOpenShift}
              disabled={isSubmitting}
              className="w-full bg-[#D67D3E] text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-orange-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Mở Ca Mới'}
            </button>
          </div>
        ) : (
          // Close Shift Form
          <div className="space-y-6">
            <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-100 text-sm">
              <p className="font-bold mb-1">Ca làm việc đang mở</p>
              <p>Bắt đầu lúc: {new Date(currentShift.start_time).toLocaleString('vi-VN')}</p>
              <p>Tiền mặt đầu ca: <span className="font-bold">{currentShift.initial_cash.toLocaleString('vi-VN')}đ</span></p>
              {currentShift.expected_cash !== undefined && (
                <p className="mt-2 pt-2 border-t border-green-200">
                  Hệ thống tính toán (cuối ca): <span className="font-black text-lg">{currentShift.expected_cash.toLocaleString('vi-VN')}đ</span>
                </p>
              )}
            </div>
            
            <div>
              <label className="block font-bold text-[#543310] mb-2">Tiền mặt thực tế đếm được (VNĐ)</label>
              <input 
                type="number" 
                value={finalCash}
                onChange={e => setFinalCash(Number(e.target.value))}
                className={`w-full border-2 rounded-xl p-3 text-lg focus:outline-none ${
                  currentShift.expected_cash !== undefined && finalCash !== currentShift.expected_cash
                    ? 'border-red-400 bg-red-50 text-red-900 focus:border-red-500'
                    : 'border-gray-200 focus:border-[#D67D3E]'
                }`}
                placeholder="Nhập số tiền kiểm đếm được..."
              />
              {currentShift.expected_cash !== undefined && finalCash !== currentShift.expected_cash && (
                <p className="text-red-500 text-sm mt-2 font-bold">
                  ⚠️ Chênh lệch: {(finalCash - currentShift.expected_cash).toLocaleString('vi-VN')}đ
                </p>
              )}
            </div>

            <button 
              onClick={handleCloseShift}
              disabled={isSubmitting}
              className="w-full bg-[#543310] text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-black disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Chốt & Đóng Ca'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftManagement;
