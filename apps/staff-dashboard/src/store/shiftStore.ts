import { create } from 'zustand';
import { apiClient } from '@fnb/utils';

type ShiftStatus = 'OPEN' | 'CLOSED';

type RawShift = {
  id?: unknown;
  branch_id?: unknown;
  branchId?: unknown;
  branch_name?: unknown;
  branchName?: unknown;
  branches?: { name?: unknown } | null;
  users?: { full_name?: unknown } | null;
  opened_by_user?: { full_name?: unknown } | null;
  opened_by_name?: unknown;
  staffName?: unknown;
  opened_at?: unknown;
  start_time?: unknown;
  startTime?: unknown;
  created_at?: unknown;
  closed_at?: unknown;
  end_time?: unknown;
  endTime?: unknown;
  starting_cash?: unknown;
  initial_cash?: unknown;
  startingCash?: unknown;
  ending_cash?: unknown;
  final_cash?: unknown;
  reportedCash?: unknown;
  expected_cash?: unknown;
  status?: unknown;
  expected_transfer?: unknown;
  total_revenue?: unknown;
};

export interface ShiftRecord {
  id: string;
  branchId: string;
  branchName: string;
  staffName: string;
  startTime: string;
  endTime: string | null;
  startingCash: number;
  revenueCash: number;
  revenueTransfer: number;
  reportedCash: number | null; // Tiền nhân viên đếm
  expectedCash: number | null;
  status: ShiftStatus;
}

interface ShiftStore {
  shifts: ShiftRecord[];
  currentShift: ShiftRecord | null;
  loading: boolean;
  error: string | null;
  fetchShifts: (branchId?: string) => Promise<void>;
  fetchCurrentShift: (branchId?: string) => Promise<void>;
  openShift: (branchId: string, startingCash: number) => Promise<ShiftRecord>;
  closeShift: (shiftId: string, endingCash: number) => Promise<ShiftRecord>;
}

export function unwrapApiData(response: unknown): unknown {
  if (response == null) return response;

  if (typeof response !== 'object') return response;

  const record = response as Record<string, unknown>;

  if ('success' in record && 'data' in record) {
    return record.data;
  }

  const nestedData = record.data;
  if (
    nestedData &&
    typeof nestedData === 'object' &&
    ('success' in (nestedData as Record<string, unknown>) ||
      'data' in (nestedData as Record<string, unknown>))
  ) {
    return unwrapApiData(nestedData);
  }

  if (
    'data' in record &&
    ('status' in record || 'headers' in record || 'config' in record)
  ) {
    return nestedData;
  }

  return response;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberOrZero(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function optionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeStatus(value: unknown): ShiftStatus {
  return value === 'CLOSED' ? 'CLOSED' : 'OPEN';
}

export function normalizeShift(raw: unknown): ShiftRecord | null {
  const value = unwrapApiData(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const shift = value as RawShift;
  const id = firstString(shift.id);
  if (!id) return null;

  const startingCash = numberOrZero(
    shift.starting_cash ?? shift.initial_cash ?? shift.startingCash,
  );
  const reportedCash = optionalNumber(
    shift.ending_cash ?? shift.final_cash ?? shift.reportedCash,
  );
  const expectedCash = optionalNumber(shift.expected_cash);

  return {
    id,
    branchId: firstString(shift.branch_id, shift.branchId),
    branchName: firstString(
      shift.branches?.name,
      shift.branch_name,
      shift.branchName,
      'Chi nhánh',
    ),
    staffName: firstString(
      shift.users?.full_name,
      shift.opened_by_user?.full_name,
      shift.opened_by_name,
      shift.staffName,
      'Nhân viên',
    ),
    startTime: firstString(
      shift.opened_at,
      shift.start_time,
      shift.startTime,
      shift.created_at,
    ),
    endTime: optionalString(shift.closed_at ?? shift.end_time ?? shift.endTime),
    startingCash,
    revenueCash: expectedCash !== null ? expectedCash - startingCash : 0,
    revenueTransfer: optionalNumber(shift.expected_transfer) || 0,
    reportedCash,
    expectedCash,
    status: normalizeStatus(shift.status),
  };
}

export function normalizeShiftListResponse(response: unknown): ShiftRecord[] {
  const payload = unwrapApiData(response);

  if (payload == null) return [];
  if (Array.isArray(payload)) {
    return payload
      .map((shift) => normalizeShift(shift))
      .filter((shift): shift is ShiftRecord => shift !== null);
  }

  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const listCandidate =
      record.shifts ??
      record.items ??
      record.records ??
      record.list ??
      record.results ??
      record.data;

    if (Array.isArray(listCandidate)) {
      return listCandidate
        .map((shift) => normalizeShift(shift))
        .filter((shift): shift is ShiftRecord => shift !== null);
    }
  }

  throw new Error('Dữ liệu ca làm việc không hợp lệ');
}

export function normalizeCurrentShiftResponse(response: unknown): ShiftRecord | null {
  const payload = unwrapApiData(response);
  if (payload == null) return null;

  if (Array.isArray(payload)) {
    return payload.map((shift) => normalizeShift(shift)).find(Boolean) ?? null;
  }

  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const nested = record.currentShift ?? record.current_shift ?? record.shift;
    if (nested !== undefined) return normalizeShift(nested);
  }

  return normalizeShift(payload);
}

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const response = record.response as { data?: { message?: unknown } } | undefined;
    if (typeof response?.data?.message === 'string') return response.data.message;
    if (typeof record.message === 'string') return record.message;
  }
  return fallback;
}

export const useShiftStore = create<ShiftStore>((set) => ({
  shifts: [],
  currentShift: null,
  loading: false,
  error: null,

  fetchShifts: async (branchId) => {
    set({ loading: true, error: null });
    try {
      const query = branchId && branchId.includes('-') ? `?branch_id=${branchId}` : '';
      const res = await apiClient.get(`/shifts${query}`);
      const mapped = normalizeShiftListResponse(res);
      set({ shifts: mapped, loading: false });
    } catch (error: any) {
      set({
        shifts: [],
        error: errorMessage(error, 'Không thể tải danh sách ca'),
        loading: false,
      });
    }
  },

  fetchCurrentShift: async (branchId) => {
    set({ loading: true, error: null });
    try {
      const query = branchId && branchId.includes('-') ? `?branch_id=${branchId}` : '';
      const res = await apiClient.get(`/shifts/current${query}`);
      set({
        currentShift: normalizeCurrentShiftResponse(res),
        loading: false,
      });
    } catch (error) {
      set({
        currentShift: null,
        error: errorMessage(error, 'Không thể tải ca hiện tại'),
        loading: false,
      });
    }
  },

  openShift: async (branchId, startingCash) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post('/shifts/open', {
        branch_id: branchId,
        starting_cash: startingCash,
      });
      const openedShift = normalizeCurrentShiftResponse(res);
      if (!openedShift) throw new Error('Dữ liệu ca làm việc không hợp lệ');
      set((state) => ({
        currentShift: openedShift,
        shifts: [openedShift, ...state.shifts.filter((shift) => shift.id !== openedShift.id)],
        loading: false,
      }));
      return openedShift;
    } catch (error) {
      const message = errorMessage(error, 'Không thể mở ca');
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  closeShift: async (shiftId, endingCash) => {
    set({ loading: true, error: null });
    try {
      const res = await apiClient.post(`/shifts/${shiftId}/close`, {
        ending_cash: endingCash,
      });
      const closedShift = normalizeCurrentShiftResponse(res);
      if (!closedShift) throw new Error('Dữ liệu ca làm việc không hợp lệ');
      set((state) => ({
        currentShift: null,
        shifts: state.shifts.map((shift) => (shift.id === closedShift.id ? closedShift : shift)),
        loading: false,
      }));
      return closedShift;
    } catch (error) {
      const message = errorMessage(error, 'Không thể đóng ca');
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },
}));
