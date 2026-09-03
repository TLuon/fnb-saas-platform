import { useEffect } from 'react';
import { RealtimeClient } from '@fnb/utils';
import { GroupOrderController } from '../store/GroupOrderController';
import { useGroupCartStore } from '../store/groupCartStore';
import { useToast } from '../components/ToastProvider';
import { createApiClient } from '@fnb/utils';

/** Đọc JWT từ cookie (set bởi login flow) */
function getTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)jwt=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const apiClient = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  getToken: () => getTokenFromCookie(),
});

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
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      socketUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
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

