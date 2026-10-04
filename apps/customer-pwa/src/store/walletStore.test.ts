import { describe, it, expect, beforeEach } from 'vitest';
import { useWalletStore } from './walletStore';

describe('useWalletStore', () => {
  beforeEach(() => {
    useWalletStore.setState({ mainBalance: 0, promoBalance: 0, history: [] });
  });

  it('should calculate total balance correctly', () => {
    useWalletStore.setState({ mainBalance: 10000, promoBalance: 5000 });
    const store = useWalletStore.getState();
    expect(store.getTotalBalance()).toBe(15000);
  });

  it('should top up main balance and add history', () => {
    const store = useWalletStore.getState();
    store.topUp(50000, 'Nạp tiền qua VietQR');
    
    const newState = useWalletStore.getState();
    expect(newState.mainBalance).toBe(50000);
    expect(newState.history).toHaveLength(1);
    expect(newState.history[0].amount).toBe(50000);
    expect(newState.history[0].type).toBe('TOP_UP');
  });

  it('should deduct from promo balance first, then main balance when spending', () => {
    useWalletStore.setState({ mainBalance: 50000, promoBalance: 20000 });
    const store = useWalletStore.getState();
    
    const success = store.spend(30000, 'Thanh toán đơn hàng');
    
    const newState = useWalletStore.getState();
    expect(success).toBe(true);
    expect(newState.promoBalance).toBe(0); 
    expect(newState.mainBalance).toBe(40000);
    
    expect(newState.history).toHaveLength(1);
    expect(newState.history[0].amount).toBe(-30000);
    expect(newState.history[0].type).toBe('PAYMENT');
  });

  it('should return false if balance is insufficient', () => {
    useWalletStore.setState({ mainBalance: 10000, promoBalance: 0 });
    const store = useWalletStore.getState();
    
    const success = store.spend(30000, 'Thanh toán đơn hàng');
    
    const newState = useWalletStore.getState();
    expect(success).toBe(false);
    expect(newState.mainBalance).toBe(10000);
    expect(newState.history).toHaveLength(0);
  });
});
