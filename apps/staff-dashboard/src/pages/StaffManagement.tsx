import { Plus, Edit2, ShieldAlert } from 'lucide-react';
import { useStaffStore } from '../store/staffStore';
import type { StaffMember } from '../store/staffStore';

export default function StaffManagement() {
  const { staff, toggleStaff } = useStaffStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black font-serif text-[var(--color-brand-primary)]">Quản lý Nhân sự</h2>
          <p className="text-gray-500 mt-2">Phân quyền và quản lý tài khoản nhân viên</p>
        </div>
        <button className="bg-[var(--color-brand-primary)] text-[var(--color-brand-neutral)] px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-[var(--color-brand-secondary)] transition shadow-md">
          <Plus size={20} />
          Thêm Nhân Viên
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-brand-secondary)] text-white">
              <th className="p-4 font-semibold">Tên nhân viên</th>
              <th className="p-4 font-semibold">Cấp bậc</th>
              <th className="p-4 font-semibold text-center">Trạng thái</th>
              <th className="p-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s: StaffMember) => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-[var(--color-brand-accent)]/20 transition">
                <td className="p-4 font-medium text-[var(--color-brand-primary)]">{s.name}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    s.role === 'OWNER' ? 'bg-[var(--color-brand-primary)] text-white' : 
                    s.role === 'SUPPORT' ? 'bg-[var(--color-brand-secondary)] text-white' : 
                    'bg-[var(--color-brand-accent)] text-[var(--color-brand-primary)]'
                  }`}>
                    {s.role}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => {
                      if (s.role !== 'OWNER') toggleStaff(s.id);
                    }}
                    disabled={s.role === 'OWNER'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      s.active ? 'bg-[var(--color-brand-primary)]' : 'bg-gray-300'
                    } ${s.role === 'OWNER' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      s.active ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </td>
                <td className="p-4 flex justify-end gap-2">
                  <button className="p-2 text-gray-400 hover:text-[var(--color-brand-primary)] transition bg-gray-50 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 shadow-sm">
                    <Edit2 size={16} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-500 transition bg-gray-50 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 shadow-sm" disabled={s.role === 'OWNER'}>
                    <ShieldAlert size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
