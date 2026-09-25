import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FloorService } from './floor.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';

describe('FloorService - updateTableStatus', () => {
  let client: any;
  let service: FloorService;

  beforeEach(() => {
    client = {
      from: vi.fn(),
    };
    service = new FloorService({ forUser: () => client } as any);
  });

  it('allows transition from OCCUPIED to AVAILABLE and clears current_order_id', async () => {
    const tableId = 'table-123';
    let updatePayload: any = null;

    client.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: tableId, status: 'OCCUPIED' },
        error: null,
      }),
      update: vi.fn((payload) => {
        updatePayload = payload;
        return {
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: tableId, ...payload },
            error: null,
          }),
        };
      }),
    });

    const result = await service.updateTableStatus('token', tableId, { status: 'AVAILABLE' });

    expect(updatePayload).toBeDefined();
    expect(updatePayload.status).toBe('AVAILABLE');
    expect(updatePayload.current_order_id).toBeNull();
    expect(result.status).toBe('AVAILABLE');
  });

  it('allows transition from OCCUPIED to CLEANING', async () => {
    const tableId = 'table-123';
    let updatePayload: any = null;

    client.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: tableId, status: 'OCCUPIED' },
        error: null,
      }),
      update: vi.fn((payload) => {
        updatePayload = payload;
        return {
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: tableId, ...payload },
            error: null,
          }),
        };
      }),
    });

    const result = await service.updateTableStatus('token', tableId, { status: 'CLEANING' });

    expect(updatePayload.status).toBe('CLEANING');
    expect(result.status).toBe('CLEANING');
  });

  it('rejects invalid manual transitions', async () => {
    const tableId = 'table-123';

    client.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: tableId, status: 'PENDING_LOCK' },
        error: null,
      }),
    });

    await expect(
      service.updateTableStatus('token', tableId, { status: 'CLEANING' as any }),
    ).rejects.toThrow(AppException);
  });
});
