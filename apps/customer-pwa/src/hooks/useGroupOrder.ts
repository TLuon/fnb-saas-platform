import { useEffect } from 'react';
import { RealtimeClient } from '@fnb/utils';
import { GroupOrderController } from '../store/GroupOrderController';
import { useGroupCartStore } from '../store/groupCartStore';
import { useToast } from '../components/ToastProvider';

export function useGroupOrder(tableId: string | null) {
  const setItems = useGroupCartStore(state => state.setItems);
  const { showInfo } = useToast();

  useEffect(() => {
    if (!tableId) return;

    // Mock client
    const token = 'mock_jwt_token';
    const client = new RealtimeClient('http://localhost:3000', token);
    
    const controller = new GroupOrderController(
      client,
      (data) => {
        if (data && data.items) {
          setItems(data.items);
          showInfo('Giỏ hàng chung vừa được cập nhật!');
        }
      },
      () => {
        console.log(`[Socket] Reconnected, fetching snapshot for table ${tableId}`);
        // Simulate snapshot fetch
        setItems([
          { id: 'm1', name: 'Bạc Xỉu (Mock Reconnect)', price: 35000, quantity: 1, addedBy: 'Khách A' }
        ]);
      }
    );

    controller.listen();

    return () => {
      controller.stop();
      client.disconnect();
    };
  }, [tableId, setItems, showInfo]);
}
