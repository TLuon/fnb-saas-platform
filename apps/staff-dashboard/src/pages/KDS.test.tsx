// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import KDS from './KDS';
import { RealtimeClient } from '@fnb/utils';

// Mock RealtimeClient
vi.mock('@fnb/utils', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
  };
  return {
    RealtimeClient: vi.fn().mockImplementation(function() {
      return {
        connect: vi.fn(),
        disconnect: vi.fn(),
        socket: mockSocket,
      };
    }),
  };
});

// Mock fetch
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ success: true }),
    ok: true,
  })
));

describe('KDS Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders kanban columns matching backend statuses', () => {
    render(<KDS />);
    expect(screen.getByText('Chờ chế biến (QUEUED)')).toBeDefined();
    expect(screen.getByText('Đang làm (PREPARING)')).toBeDefined();
    expect(screen.getByText('Hoàn thành (READY)')).toBeDefined();
  });

  it('receives kds_new_ticket and renders individual items in QUEUED', () => {
    render(<KDS />);
    
    const RealtimeClientMock = vi.mocked(RealtimeClient);
    const mockSocket = RealtimeClientMock.mock.results[0].value.socket;
    
    const onCall = mockSocket.on.mock.calls.find((c: any) => c[0] === 'kds_new_ticket');
    const callback = onCall![1];
    
    act(() => {
      callback({
        orderId: 'order-1',
        items: [
          { id: 'item-1', name: 'Cà phê sữa', quantity: 2, kitchen_status: 'QUEUED' },
          { id: 'item-2', name: 'Bánh ngọt', quantity: 1, kitchen_status: 'QUEUED' }
        ],
        createdAt: new Date().toISOString()
      });
    });

    expect(screen.getByText(/Cà phê sữa/)).toBeDefined();
    expect(screen.getByText(/Bánh ngọt/)).toBeDefined();
    expect(screen.getAllByText('Bắt đầu làm')).toHaveLength(2);
  });
});
