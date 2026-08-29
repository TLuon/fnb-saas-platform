import { describe, it, expect, beforeEach } from 'vitest';
import { useCoffeePassStore } from './coffeePassStore';

describe('useCoffeePassStore', () => {
  beforeEach(() => {
    useCoffeePassStore.setState({ activePasses: [] });
  });

  it('should add a new pass', () => {
    const store = useCoffeePassStore.getState();
    store.buyPass({ id: 'pass1', name: 'Gói 10 ly', totalLimit: 10, remaining: 10 });
    
    expect(useCoffeePassStore.getState().activePasses).toHaveLength(1);
    expect(useCoffeePassStore.getState().activePasses[0].id).toBe('pass1');
  });

  it('should use a pass ticket', () => {
    const store = useCoffeePassStore.getState();
    store.buyPass({ id: 'pass1', name: 'Gói 10 ly', totalLimit: 10, remaining: 10 });
    
    const success = useCoffeePassStore.getState().useTicket('pass1');
    expect(success).toBe(true);
    expect(useCoffeePassStore.getState().activePasses[0].remaining).toBe(9);
  });

  it('should return false if pass is out of tickets', () => {
    const store = useCoffeePassStore.getState();
    store.buyPass({ id: 'pass1', name: 'Gói 1 ly', totalLimit: 1, remaining: 0 });
    
    const success = useCoffeePassStore.getState().useTicket('pass1');
    expect(success).toBe(false);
    expect(useCoffeePassStore.getState().activePasses[0].remaining).toBe(0);
  });
});
