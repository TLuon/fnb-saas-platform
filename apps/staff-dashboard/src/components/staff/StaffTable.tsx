import { Edit2, ShieldOff } from 'lucide-react';
import type { StaffMember } from '../../store/staffStore';
import { RoleBadge } from './RoleBadge';

interface StaffTableProps {
  staff: StaffMember[];
  onEditStaff: (s: StaffMember) => void;
  onDeactivateStaff: (s: StaffMember) => void;
}

export function StaffTable({ staff, onEditStaff, onDeactivateStaff }: StaffTableProps) {
  if (staff.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <p className="text-gray-400 font-medium">Không tìm thấy nhân viên nào phù hợp.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-[var(--color-brand-secondary)] text-white">
              <th className="p-4 font-semibold whitespace-nowrap">Họ tên</th>
              <th className="p-4 font-semibold whitespace-nowrap">Điện thoại</th>
              <th className="p-4 font-semibold whitespace-nowrap">Chức vụ</th>
              <th className="p-4 font-semibold whitespace-nowrap">Trạng thái</th>
              <th className="p-4 font-semibold text-right whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {staff.map((s) => (
              <tr
                key={s.id}
                className={`transition-colors hover:bg-gray-50 ${!s.active ? 'opacity-70 bg-gray-50' : ''}`}
              >
                <td className="p-4">
                  <div className={`font-bold ${s.active ? 'text-[var(--color-brand-primary)]' : 'text-gray-500'}`}>
                    {s.name}
                  </div>
                </td>

                <td className="p-4">
                  <span className="text-gray-600 font-medium">
                    {s.phone || 'Chưa cập nhật'}
                  </span>
                </td>

                <td className="p-4">
                  <RoleBadge role={s.role} isActive={s.active} />
                </td>

                <td className="p-4">
                  {s.active ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-success)]">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-brand-success)] animate-pulse" />
                      Đang hoạt động
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-gray-400">
                      Đã vô hiệu hóa
                    </span>
                  )}
                </td>

                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => onEditStaff(s)}
                      className="p-2 text-gray-400 hover:text-[var(--color-brand-primary)] transition bg-white rounded-lg border border-gray-200 hover:border-[var(--color-brand-primary)] shadow-sm"
                      title="Chỉnh sửa"
                    >
                      <Edit2 size={16} />
                    </button>

                    {s.active && (
                      <button 
                        onClick={() => onDeactivateStaff(s)}
                        className="p-2 text-gray-400 hover:text-[var(--color-brand-error)] transition bg-white rounded-lg border border-gray-200 hover:border-[var(--color-brand-error)] shadow-sm"
                        title="Vô hiệu hóa tài khoản"
                      >
                        <ShieldOff size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
