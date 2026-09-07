import { useEffect, useMemo } from 'react';
import { RealtimeClient } from '@fnb/utils';
import { GroupOrderController } from '../store/GroupOrderController';
import { useGroupCartStore } from '../store/groupCartStore';
import { useToast } from '../components/ToastProvider';
import { createApiClient } from '@fnb/utils';

/** Đọc JWT từ cookie (set bởi login flow) */
function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function useGroupOrder(tableId: string | null) {
  const setItems = useGroupCartStore(state => state.setItems);
  const { showInfo, showError } = useToast();

  const apiClient = useMemo(() => createApiClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    getToken: () => getTokenFromCookie(),
  }), []);

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
        if (data && data.cart_items) {
          setItems(data.cart_items);
          showInfo('Giỏ hàng chung vừa được cập nhật!');
        }
      },
      async () => {
        // Reconnect: fetch lại giỏ hàng từ API thay vì dùng dữ liệu mock
        try {
          const res = await apiClient.get(`/group-order/${tableId}/cart`);
          if (res.data && res.data.cart_items) {
            setItems(res.data.cart_items);
          }
        } catch (err) {
          showError('Không thể tải lại giỏ hàng. Vui lòng thử lại.');
        }
      }
    );

    client.connect();
    controller.listen();

    return () => {
      controller.stop();
      client.disconnect();
    };
  }, [tableId, setItems, showInfo, showError]);
}

