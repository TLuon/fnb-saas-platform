import type { Role } from '../../store/staffStore';

interface RoleBadgeProps {
  role: Role;
  isActive: boolean;
}

export function RoleBadge({ role, isActive }: RoleBadgeProps) {
  if (!isActive) {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-full bg-[#E8DED5] text-[#6B625B]">
        Vô hiệu hóa
      </span>
    );
  }

  switch (role) {
    case 'OWNER':
      return (
        <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-full bg-[var(--color-brand-primary)] text-white">
          Chủ quán (Owner)
        </span>
      );
    case 'SUPPORT':
      return (
        <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-full bg-[var(--color-brand-secondary)] text-white">
          CSKH (Support)
        </span>
      );
    case 'STAFF':
    default:
      return (
        <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-full bg-[#FED8B1] text-[var(--color-brand-primary)]">
          Nhân viên (Staff)
        </span>
      );
  }
}
