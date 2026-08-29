import { describe, it, expect, beforeEach } from 'vitest';
import { useMenuStore } from './menuStore';

describe('useMenuStore', () => {
  beforeEach(() => {
    useMenuStore.setState({ categories: [], products: [] });
  });

  it('should add a category', () => {
    const store = useMenuStore.getState();
    store.addCategory({ id: 'c1', name: 'Cà phê' });
    expect(useMenuStore.getState().categories).toHaveLength(1);
    expect(useMenuStore.getState().categories[0].name).toBe('Cà phê');
  });

  it('should add and toggle a product', () => {
    const store = useMenuStore.getState();
    store.addProduct({ id: 'p1', name: 'Đen đá', price: 29000, categoryId: 'c1', active: true });
    expect(useMenuStore.getState().products).toHaveLength(1);
    
    useMenuStore.getState().toggleProduct('p1');
    expect(useMenuStore.getState().products[0].active).toBe(false);
  });
});
