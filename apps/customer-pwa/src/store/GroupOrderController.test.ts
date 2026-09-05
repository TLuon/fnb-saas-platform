import { describe, it, expect, vi } from 'vitest';
import { GroupOrderController } from './GroupOrderController';

describe('GroupOrderController', () => {
  it('should update cart when receiving group_order_cart_updated event', () => {
    const mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
    } as any;
    const mockClient = { socket: mockSocket } as any;

    const onUpdate = vi.fn();
    const onReconnect = vi.fn();

    const controller = new GroupOrderController(mockClient, onUpdate, onReconnect);
    controller.listen();

    expect(mockSocket.on).toHaveBeenCalledWith('group_order_cart_updated', expect.any(Function));

    const eventCallback = mockSocket.on.mock.calls.find((c: any) => c[0] === 'group_order_cart_updated')[1];
    eventCallback({ items: [{ id: 'p1', quantity: 2 }] });

    expect(onUpdate).toHaveBeenCalledWith({ items: [{ id: 'p1', quantity: 2 }] });
  });

  it('should trigger onReconnect callback when socket reconnects', () => {
    const mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
    } as any;
    const mockClient = { socket: mockSocket } as any;

    const onUpdate = vi.fn();
    const onReconnect = vi.fn();

    const controller = new GroupOrderController(mockClient, onUpdate, onReconnect);
    controller.listen();

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));

    const connectCallback = mockSocket.on.mock.calls.find((c: any) => c[0] === 'connect')[1];
    connectCallback();

    expect(onReconnect).toHaveBeenCalled();
  });
});
