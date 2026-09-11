import { Search, UserPlus } from 'lucide-react';
import type { Role } from '../../store/staffStore';

interface StaffToolbarProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  roleFilter: Role | 'ALL';
  setRoleFilter: (v: Role | 'ALL') => void;
  statusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE';
  setStatusFilter: (v: 'ALL' | 'ACTIVE' | 'INACTIVE') => void;
  onAddStaff: () => void;
}

export function StaffToolbar({
  searchTerm, setSearchTerm,
  roleFilter, setRoleFilter,
  statusFilter, setStatusFilter,
  onAddStaff
}: StaffToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 w-full md:w-auto flex-1 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo tên/SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:border-transparent outline-none transition-all"
          />
        </div>

        <select 
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:border-transparent outline-none bg-white cursor-pointer"
        >
          <option value="ALL">Tất cả chức vụ</option>
          <option value="OWNER">Chủ quán (Owner)</option>
          <option value="STAFF">Nhân viên (Staff)</option>
          <option value="SUPPORT">CSKH (Support)</option>
        </select>

        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[var(--color-brand-secondary)] focus:border-transparent outline-none bg-white cursor-pointer"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="INACTIVE">Bị vô hiệu hóa</option>
        </select>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto">
        <button 
          onClick={onAddStaff}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-brand-primary)] text-white font-bold rounded-xl hover:bg-[#3d250c] transition-colors shadow-sm"
        >
          <UserPlus size={18} />
          Thêm nhân viên
        </button>
      </div>
    </div>
  );
}
