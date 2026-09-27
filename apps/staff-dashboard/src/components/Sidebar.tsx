import { NavLink } from 'react-router-dom';
import { Coffee, Users, BarChart3, UsersRound, ClipboardList, MessageSquareWarning, UtensilsCrossed, Clock, Package, Receipt } from 'lucide-react';
import { authStore } from '@fnb/utils';
import { useStore } from 'zustand';

export function Sidebar() {
  const role = useStore(authStore, state => state.role);
  const profile = useStore(authStore, state => state.profile);
  const userEmail = (profile?.email || '').toLowerCase();

  const ownerLinks = [
    { to: '/menu-management', icon: <Coffee size={20} />, label: 'Quản lý Thực đơn' },
    { to: '/staff-management', icon: <Users size={20} />, label: 'Quản lý Nhân sự' },
    { to: '/analytics', icon: <BarChart3 size={20} />, label: 'Báo cáo Doanh thu' },
    { to: '/orders-history', icon: <Receipt size={20} />, label: 'Thống kê hóa đơn' },
    { to: '/cdp', icon: <UsersRound size={20} />, label: 'Hồ sơ Khách hàng' },
    { to: '/shifts', icon: <Clock size={20} />, label: 'Quản lý Ca làm việc' },
    { to: '/inventory', icon: <Package size={20} />, label: 'Kho & Định lượng' },
    { to: '/floor-editor', icon: <UtensilsCrossed size={20} />, label: 'Sơ đồ Bàn' },
  ];

  const supportLinks = [
    { to: '/support/board', icon: <ClipboardList size={20} />, label: 'Hàng đợi Tra soát' },
    { to: '/support/tickets', icon: <MessageSquareWarning size={20} />, label: 'Quản lý Khiếu nại' },
  ];

  let staffLinks = [
    { to: '/pos', icon: <Coffee size={20} />, label: 'Bán hàng (POS)' },
    { to: '/floor-map', icon: <UsersRound size={20} />, label: 'Sơ đồ bàn' },
    { to: '/kds/kitchen', icon: <UtensilsCrossed size={20} />, label: 'KDS - Bếp (Theo dõi)' },
    { to: '/kds/bar', icon: <Coffee size={20} />, label: 'KDS - Quầy Bar (Theo dõi)' },
    { to: '/orders-history', icon: <Receipt size={20} />, label: 'Thống kê hóa đơn' },
  ];

  if (userEmail.includes('bep')) {
    staffLinks = [
      { to: '/kds/kitchen', icon: <UtensilsCrossed size={20} />, label: 'KDS - Bếp' },
    ];
  } else if (userEmail.includes('bar')) {
    staffLinks = [
      { to: '/kds/bar', icon: <Coffee size={20} />, label: 'KDS - Quầy Bar' },
    ];
  }

  const links = role === 'OWNER'
    ? ownerLinks
    : role === 'SUPPORT'
      ? supportLinks
      : role === 'STAFF'
        ? staffLinks
        : [];

  if (!role && !profile) return null;


  return (
    <aside className="w-64 bg-[var(--color-brand-neutral)] text-[var(--color-brand-primary)] flex flex-col h-screen border-r border-gray-200 shadow-sm relative z-10">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-black font-serif tracking-wide">
          <span className="text-[var(--color-brand-secondary)]">F&B</span> {role}
        </h1>
        <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Dashboard v1.0</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `nav-item flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 ${isActive
                ? 'bg-[#543310] text-white shadow-md'
                : 'text-[#6B625B] hover:bg-[#E8DED5] hover:text-[#543310]'
              }`
            }
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
