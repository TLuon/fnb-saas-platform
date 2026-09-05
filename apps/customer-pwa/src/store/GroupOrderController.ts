import { RealtimeClient } from '@fnb/utils';

export class GroupOrderController {
  constructor(
    private client: RealtimeClient,
    private onUpdate: (data: any) => void,
    private onReconnect: () => void
  ) {}

  listen() {
    this.client.socket.on('group_order_cart_updated', this.onUpdate);
    this.client.socket.on('connect', this.onReconnect);
  }

  stop() {
    this.client.socket.off('group_order_cart_updated', this.onUpdate);
    this.client.socket.off('connect', this.onReconnect);
  }
}
