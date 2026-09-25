import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '@fnb/utils';
import {
  normalizeCurrentShiftResponse,
  normalizeShiftListResponse,
  useShiftStore,
} from './shiftStore';

const branchId = '22222222-2222-2222-2222-222222222222';

const openShiftRow = {
  id: 'shift-open',
  branch_id: branchId,
  opened_at: '2026-09-24T09:42:05.277128+00:00',
  closed_at: null,
  starting_cash: 500000,
  ending_cash: null,
  expected_cash: 500000,
  status: 'OPEN',
};

const closedShiftRow = {
  id: 'shift-closed',
  branch_id: branchId,
  opened_at: '2026-09-24T08:00:00.000000+00:00',
  closed_at: '2026-09-24T09:00:00.000000+00:00',
  starting_cash: 300000,
  ending_cash: 450000,
  status: 'CLOSED',
};

describe('shiftStore response handling', () => {
  beforeEach(() => {
    useShiftStore.setState({
      shifts: [],
      currentShift: null,
      loading: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  it('handles null current shift without crashing', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce(null as any);

    await useShiftStore.getState().fetchCurrentShift(branchId);

    expect(useShiftStore.getState().currentShift).toBeNull();
    expect(useShiftStore.getState().error).toBeNull();
  });

  it('handles an empty shift list envelope', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: { success: true, data: [], error: null },
    } as any);

    await useShiftStore.getState().fetchShifts(branchId);

    expect(useShiftStore.getState().shifts).toEqual([]);
  });

  it('maps populated backend shift rows to safe frontend fields', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce([openShiftRow, closedShiftRow] as any);

    await useShiftStore.getState().fetchShifts(branchId);

    const shifts = useShiftStore.getState().shifts;
    expect(shifts).toHaveLength(2);
    expect(shifts[0]).toMatchObject({
      id: 'shift-open',
      branchId,
      startTime: openShiftRow.opened_at,
      startingCash: 500000,
      reportedCash: null,
      expectedCash: 500000,
      status: 'OPEN',
    });
    expect(shifts[1]).toMatchObject({
      id: 'shift-closed',
      endTime: closedShiftRow.closed_at,
      reportedCash: 450000,
      status: 'CLOSED',
    });
  });

  it('reports malformed shift list responses', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ unexpected: true } as any);

    await useShiftStore.getState().fetchShifts(branchId);

    expect(useShiftStore.getState().shifts).toEqual([]);
    expect(useShiftStore.getState().error).toBe('Dữ liệu ca làm việc không hợp lệ');
  });

  it('captures API failures', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValueOnce({
      response: { data: { message: 'Nhân viên không có quyền truy cập chi nhánh khác' } },
    });

    await useShiftStore.getState().fetchCurrentShift(branchId);

    expect(useShiftStore.getState().currentShift).toBeNull();
    expect(useShiftStore.getState().error).toBe(
      'Nhân viên không có quyền truy cập chi nhánh khác',
    );
  });

  it('refreshes state after successful open and close shift calls', async () => {
    vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce(openShiftRow as any)
      .mockResolvedValueOnce({ ...openShiftRow, status: 'CLOSED', ending_cash: 500000 } as any);

    const opened = await useShiftStore.getState().openShift(branchId, 500000);

    expect(opened.status).toBe('OPEN');
    expect(useShiftStore.getState().currentShift?.id).toBe('shift-open');
    expect(useShiftStore.getState().shifts).toHaveLength(1);

    const closed = await useShiftStore.getState().closeShift('shift-open', 500000);

    expect(closed.status).toBe('CLOSED');
    expect(useShiftStore.getState().currentShift).toBeNull();
    expect(useShiftStore.getState().shifts[0]).toMatchObject({
      id: 'shift-open',
      status: 'CLOSED',
      reportedCash: 500000,
    });
  });

  it('normalizes legitimate alternate response shapes', () => {
    expect(normalizeCurrentShiftResponse({ data: { success: true, data: null } })).toBeNull();
    expect(normalizeShiftListResponse({ shifts: [openShiftRow] })).toHaveLength(1);
    expect(normalizeShiftListResponse({ items: [] })).toEqual([]);
  });
});
