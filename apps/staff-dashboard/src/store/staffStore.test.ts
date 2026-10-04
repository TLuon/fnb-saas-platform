import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStaffStore } from './staffStore';
import { apiClient } from '@fnb/utils';

vi.mock('@fnb/utils', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  authStore: {
    setState: vi.fn(),
    getState: vi.fn(() => ({ accessToken: 'mock-token' })),
  },
}));

describe('useStaffStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStaffStore.setState({ staff: [] });
  });

  it('fetches staff list from API', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: [
        { id: '1', full_name: 'Nguyen Van A', role: 'STAFF', is_active: true }
      ]
    });

    await useStaffStore.getState().fetchStaff();

    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('/staff'));

    const store = useStaffStore.getState();
    expect(store.staff).toHaveLength(1);
    expect(store.staff[0].name).toBe('Nguyen Van A');
  });

  it('toggles staff status via API', async () => {
    useStaffStore.setState({
      staff: [{ id: '1', name: 'Nguyen Van A', role: 'STAFF', active: true }]
    });

    vi.mocked(apiClient.patch).mockResolvedValueOnce({});
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: [{ id: '1', full_name: 'Nguyen Van A', role: 'STAFF', is_active: false }]
    });

    await useStaffStore.getState().toggleStaff('1');

    expect(apiClient.patch).toHaveBeenCalledWith('/staff/1/deactivate');
    expect(useStaffStore.getState().staff[0].active).toBe(false);
  });
});
