import type { Role } from '../../store/staffStore';

interface RoleBadgeProps {
  role: Role;
  isActive: boolean;
}

export function RoleBadge({ role, isActive }: RoleBadgeProps) {
  const getRoleLabel = (r: Role) => {
    switch (r) {
      case 'OWNER':
        return 'Chủ quán (Owner)';
      case 'SUPPORT':
        return 'CSKH (Support)';
      case 'STAFF':
      default:
        return 'Nhân viên (Staff)';
    }
  };

  if (!isActive) {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300 shadow-sm">
        {getRoleLabel(role)} • Vô hiệu hóa
      </span>
    );
  }

  switch (role) {
    case 'OWNER':
      return (
        <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-full bg-[var(--color-brand-primary)] text-white shadow-sm">
          Chủ quán (Owner)
        </span>
      );
    case 'SUPPORT':
      return (
        <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-full bg-[var(--color-brand-secondary)] text-white shadow-sm">
          CSKH (Support)
        </span>
      );
    case 'STAFF':
    default:
      return (
        <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-full bg-[#FED8B1] text-[var(--color-brand-primary)] shadow-sm">
          Nhân viên (Staff)
        </span>
      );
  }
}
