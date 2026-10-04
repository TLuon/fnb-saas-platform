import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMenuStore } from './menuStore';
import { apiClient } from '@fnb/utils';

vi.mock('@fnb/utils', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useMenuStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMenuStore.setState({ categories: [], products: [] });
  });

  it('fetches categories and products from API', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === '/categories') {
        return Promise.resolve({ data: [{ id: 'c1', name: 'Trà' }] });
      }
      if (url === '/products') {
        return Promise.resolve({
          data: [{ id: 'p1', name: 'Trà đào', price: 30000, category_id: 'c1', is_active: true, image_url: '' }],
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    await useMenuStore.getState().fetchMenu();

    const state = useMenuStore.getState();
    expect(state.categories).toHaveLength(1);
    expect(state.products).toHaveLength(1);
    expect(state.products[0].name).toBe('Trà đào');
    expect(state.products[0].image_url).toBe('');
  });

  it('calls POST /products/upload-image and returns secure_url', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        success: true,
        data: {
          secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          public_id: 'sample',
        },
      },
    });

    const file = new File(['content'], 'sample.jpg', { type: 'image/jpeg' });
    const url = await useMenuStore.getState().uploadImage(file);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/products/upload-image',
      expect.any(FormData),
      expect.objectContaining({
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),
    );
    expect(url).toBe('https://res.cloudinary.com/demo/image/upload/sample.jpg');
  });

  it('adds product with image_url correctly', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        id: 'p2',
        name: 'Trà Sữa',
        price: 35000,
        category_id: 'c1',
        is_active: true,
        image_url: 'https://res.cloudinary.com/demo/image/upload/milktea.jpg',
      },
    });

    await useMenuStore.getState().addProduct({
      name: 'Trà Sữa',
      price: 35000,
      categoryId: 'c1',
      active: true,
      image_url: 'https://res.cloudinary.com/demo/image/upload/milktea.jpg',
    });

    const state = useMenuStore.getState();
    expect(state.products).toHaveLength(1);
    expect(state.products[0].image_url).toBe('https://res.cloudinary.com/demo/image/upload/milktea.jpg');
  });

  it('updates product and preserves or updates image_url', async () => {
    useMenuStore.setState({
      products: [
        {
          id: 'p1',
          name: 'Trà đào',
          price: 30000,
          categoryId: 'c1',
          active: true,
          image_url: 'https://res.cloudinary.com/demo/image/upload/peach.jpg',
        },
      ],
    });

    vi.mocked(apiClient.patch).mockResolvedValue({
      data: {
        id: 'p1',
        name: 'Trà đào cam sả',
        price: 35000,
        image_url: 'https://res.cloudinary.com/demo/image/upload/peach-new.jpg',
      },
    });

    await useMenuStore.getState().updateProduct('p1', {
      name: 'Trà đào cam sả',
      price: 35000,
      image_url: 'https://res.cloudinary.com/demo/image/upload/peach-new.jpg',
    });

    const state = useMenuStore.getState();
    expect(state.products[0].name).toBe('Trà đào cam sả');
    expect(state.products[0].image_url).toBe('https://res.cloudinary.com/demo/image/upload/peach-new.jpg');
  });

  it('handles toggle product correctly', async () => {
    useMenuStore.setState({
      products: [{ id: 'p1', name: 'Trà đào', price: 30000, categoryId: 'c1', active: true }],
    });

    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });

    await useMenuStore.getState().toggleProduct('p1');
    expect(useMenuStore.getState().products[0].active).toBe(false);
  });
});
