import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStaffStore } from './staffStore';
import { useAuthStore } from './authStore';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('useStaffStore', () => {
  beforeEach(() => {
    useStaffStore.setState({ staff: [] });
    useAuthStore.setState({ accessToken: 'mock-token' });
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });
  });

  it('fetches staff list from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { id: '1', name: 'Nguyen Van A', role: 'STAFF', active: true }
      ])
    });

    await useStaffStore.getState().fetchStaff();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/staff'),
      expect.objectContaining({ headers: expect.objectContaining({ 'Authorization': 'Bearer mock-token' }) })
    );

    const store = useStaffStore.getState();
    expect(store.staff).toHaveLength(1);
    expect(store.staff[0].name).toBe('Nguyen Van A');
  });

  it('toggles staff status via API', async () => {
    useStaffStore.setState({
      staff: [{ id: '1', name: 'Nguyen Van A', role: 'STAFF', active: true }]
    });

    await useStaffStore.getState().toggleStaff('1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/staff/1/deactivate'),
      expect.objectContaining({ method: 'PATCH' })
    );

    expect(useStaffStore.getState().staff[0].active).toBe(false);
  });
});
