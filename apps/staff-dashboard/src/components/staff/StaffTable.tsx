import { Edit2, KeyRound, Power } from 'lucide-react';
import type { StaffMember } from '../../store/staffStore';
import { RoleBadge } from './RoleBadge';

interface StaffTableProps {
  staff: StaffMember[];
  onEditStaff: (s: StaffMember) => void;
  onDeactivateStaff: (s: StaffMember) => void;
  onToggleStaff: (s: StaffMember) => void;
  onResetPassword: (s: StaffMember) => void;
}

export function StaffTable({
  staff,
  onEditStaff,
  onDeactivateStaff,
  onToggleStaff,
  onResetPassword,
}: StaffTableProps) {
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
              <th className="p-4 font-semibold whitespace-nowrap">Trạng thái tài khoản</th>
              <th className="p-4 font-semibold text-right whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {staff.map((s) => (
              <tr
                key={s.id}
                className="transition-colors hover:bg-amber-50/40 bg-white"
              >
                <td className="p-4">
                  <div className={`font-bold ${s.active ? 'text-[var(--color-brand-primary)]' : 'text-gray-700'}`}>
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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      BẬT HOẠT ĐỘNG
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      VÔ HIỆU HÓA (ĐÃ TẮT)
                    </span>
                  )}
                </td>

                <td className="p-4">
                  <div className="flex justify-end gap-2 items-center">
                    {/* Reset Password Button */}
                    <button
                      onClick={() => onResetPassword(s)}
                      className="p-2 text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 transition rounded-xl border border-amber-200 shadow-sm flex items-center gap-1 text-xs font-bold"
                      title="Reset Mật khẩu nhân viên"
                    >
                      <KeyRound size={15} />
                      <span className="hidden sm:inline">Reset Pass</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => onEditStaff(s)}
                      className="p-2 text-gray-600 hover:text-[var(--color-brand-primary)] transition bg-white rounded-xl border border-gray-200 hover:border-[var(--color-brand-primary)] shadow-sm"
                      title="Chỉnh sửa thông tin"
                    >
                      <Edit2 size={16} />
                    </button>

                    {/* Highly Visible Toggle Switch Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (s.active) {
                          onDeactivateStaff(s);
                        } else {
                          onToggleStaff(s);
                        }
                      }}
                      className={`relative inline-flex items-center h-8 px-2 rounded-full transition-all duration-300 shadow-sm border font-bold text-xs gap-1.5 cursor-pointer ${
                        s.active
                          ? 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700'
                          : 'bg-rose-600 border-rose-700 text-white hover:bg-rose-700'
                      }`}
                      title={s.active ? 'Bấm để VÔ HIỆU HÓA (TẮT tài khoản)' : 'Bấm để BẬT KÍCH HOẠT tài khoản'}
                    >
                      <Power size={14} className={s.active ? 'text-white' : 'text-white/80'} />
                      <span>{s.active ? 'TẮT' : 'BẬT'}</span>
                      <span
                        className={`inline-block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                          s.active ? 'translate-x-0' : 'translate-x-0'
                        }`}
                      />
                    </button>
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
