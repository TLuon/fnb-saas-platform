import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMenuStore } from './menuStore';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('useMenuStore', () => {
  beforeEach(() => {
    useMenuStore.setState({ categories: [], products: [] });
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });
  });

  it('fetches categories and products from API', async () => {
    // Mock sequential fetch calls for categories and products
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'c1', name: 'Trà' }])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'p1', name: 'Trà đào', price: 30000, categoryId: 'c1', active: true }])
      });

    await useMenuStore.getState().fetchMenu();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/menu/categories'),
      expect.objectContaining({ headers: expect.objectContaining({ 'Authorization': 'Bearer mock-token' }) })
    );

    const store = useMenuStore.getState();
    expect(store.categories).toHaveLength(1);
    expect(store.products).toHaveLength(1);
    expect(store.categories[0].name).toBe('Trà');
  });

  it('toggles product status via API', async () => {
    useMenuStore.setState({
      products: [{ id: 'p1', name: 'Trà đào', price: 30000, categoryId: 'c1', active: true }]
    });

    await useMenuStore.getState().toggleProduct('p1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/menu/products/p1'),
      expect.objectContaining({ method: 'PATCH' })
    );

    expect(useMenuStore.getState().products[0].active).toBe(false);
  });
});
