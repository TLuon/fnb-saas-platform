import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Coffee, Users, BarChart3, UsersRound, ClipboardList, MessageSquareWarning, UtensilsCrossed, Clock, Package, Receipt } from 'lucide-react';
import { authStore, apiClient } from '@fnb/utils';
import { useStore } from 'zustand';
import { useModal } from './ModalProvider';

export function Sidebar() {
  const { showAlert } = useModal();
  const role = useStore(authStore, state => state.role);
  const profile = useStore(authStore, state => state.profile);
  const userEmail = (profile?.email || '').toLowerCase();
  
  const [pendingCount, setPendingCount] = useState(0);
  const [readyCount, setReadyCount] = useState(0);

  useEffect(() => {
    if (role !== 'STAFF' && role !== 'OWNER') return;

    const fetchPending = async () => {
      try {
        const res = await apiClient.get('/reservations?status=PENDING');
        const list = res.data?.data || res.data || [];
        setPendingCount(prev => {
          if (list.length > prev) {
            showAlert(`Có ${list.length - prev} bàn đặt mới đang chờ xác nhận cọc!`, 'success', '🔔 BÀN ĐẶT MỚI');
          }
          return list.length;
        });
        
        // Fetch READY orders for POS badge
        const kdsRes = await apiClient.get('/orders/kds?status=READY');
        const kdsList = kdsRes.data?.data || kdsRes.data || [];
        setReadyCount(prev => {
          if (kdsList.length > prev) {
            showAlert(`Có ${kdsList.length - prev} món ăn vừa làm xong. Vui lòng giao cho khách!`, 'success', '🍲 MÓN ĐÃ SẴN SÀNG');
          }
          return kdsList.length;
        });
      } catch (err) {
        console.error('Failed to fetch badge counts:', err);
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, [role]);

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
            <span className="flex-1">{link.label}</span>
            {link.to === '/floor-map' && pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse shadow-md">
                {pendingCount}
              </span>
            )}
            {link.to === '/pos' && readyCount > 0 && (
              <span className="bg-green-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse shadow-md" title={`${readyCount} món đã xong`}>
                {readyCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
