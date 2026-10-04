import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cartStore';

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('should add item to cart', () => {
    const store = useCartStore.getState();
    store.addItem({ id: 'p1', name: 'Coffee', price: 30000, quantity: 1 });
    
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].id).toBe('p1');
    expect(useCartStore.getState().totalPrice()).toBe(30000);
  });

  it('should increment quantity if item already exists', () => {
    const store = useCartStore.getState();
    store.addItem({ id: 'p1', name: 'Coffee', price: 30000, quantity: 1 });
    store.addItem({ id: 'p1', name: 'Coffee', price: 30000, quantity: 2 });
    
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
    expect(useCartStore.getState().totalPrice()).toBe(90000);
  });

  it('should remove item from cart', () => {
    const store = useCartStore.getState();
    store.addItem({ id: 'p1', name: 'Coffee', price: 30000, quantity: 1 });
    store.removeItem('p1');
    
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().totalPrice()).toBe(0);
  });
});
