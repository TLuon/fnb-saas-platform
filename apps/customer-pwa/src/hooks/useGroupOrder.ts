import { useEffect } from 'react';
import { RealtimeClient } from '@fnb/utils';
import { GroupOrderController } from '../store/GroupOrderController';
import { useGroupCartStore } from '../store/groupCartStore';
import { useToast } from '../components/ToastProvider';
import { apiClient } from '@fnb/utils';

/** Đọc JWT từ cookie (set bởi login flow) */
function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function useGroupOrder(tableId: string | null) {
  const setItems = useGroupCartStore(state => state.setItems);
  const { showInfo, showError } = useToast();

  useEffect(() => {
    if (!tableId) return;

    const token = getTokenFromCookie();
    if (!token) {
      showError('Chưa đăng nhập. Vui lòng đăng nhập lại.');
      return;
    }

    const client = new RealtimeClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ioekhkpzrpuivzzannvn.supabase.co',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_36iHq3qBFqoisdD4tGTXeA_238_YgDa',
      socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
      token,
    });

    const controller = new GroupOrderController(
      client,
      (data) => {
        const payload = data?.data || data;
        if (payload && payload.cart_items) {
          setItems(payload.cart_items);
          showInfo('Giỏ hàng chung vừa được cập nhật!');
        }
      },
      async () => {
        // Reconnect: join group order room & sync latest cart from API
        try {
          client.socket.emit('join_group_order', { table_id: tableId });
          const res = await apiClient.get(`/group-order/${tableId}/cart`);
          const payload = (res.data as any)?.data || res.data;
          if (payload && payload.cart_items) {
            setItems(payload.cart_items);
          }
        } catch (err) {
          // If session not started or error, log silently
          console.debug('No active group order session yet or failed to fetch cart:', err);
        }
      }
    );

    let isMounted = true;
    const init = async () => {
      await client.connect();
      if (!isMounted) return;
      controller.listen();
      client.socket.emit('join_group_order', { table_id: tableId });
    };
    init();

    return () => {
      isMounted = false;
      if (client.socket) {
        client.socket.emit('leave_group_order', { table_id: tableId });
      }
      controller.stop();
      client.disconnect();
    };
  }, [tableId, setItems, showInfo, showError]);
}

