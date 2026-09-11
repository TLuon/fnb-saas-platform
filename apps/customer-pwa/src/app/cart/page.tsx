'use client';

import React, { useEffect, useState } from 'react';
import { useCartStore } from '../../stores/cartStore';
import { CartHeader } from '../../components/cart/CartHeader';
import { CartItemRow } from '../../components/cart/CartItemRow';
import { OrderNoteField } from '../../components/cart/OrderNoteField';
import { BranchTableSummary } from '../../components/cart/BranchTableSummary';
import { PriceSummary } from '../../components/cart/PriceSummary';
import { EmptyCartState } from '../../components/cart/EmptyCartState';
import { CheckoutButton } from '../../components/cart/CheckoutButton';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { LoginRequiredModal } from '../../components/LoginRequiredModal';
import { apiClient } from '@fnb/utils';

export default function CartPage() {
  const { showLoginModal, setShowLoginModal, requireAuth } = useAuthGuard();
  
  const items = useCartStore(state => state.items);
  const orderNote = useCartStore(state => state.orderNote);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const setOrderNote = useCartStore(state => state.setOrderNote);
  const getSubtotal = useCartStore(state => state.getSubtotal);
  const getTotalItems = useCartStore(state => state.getTotalItems);

  const [isMounted, setIsMounted] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Ideally requireAuth(() => {}) here if cart should be completely hidden for guests
    // But typically we let them see the cart, and block on checkout.
  }, []);

  // Simulate checking availability with backend on cart load
  useEffect(() => {
    if (!isMounted || items.length === 0) return;
    
    const checkAvailability = async () => {
      try {
        setCheckingAvailability(true);
        // Call API to check product availability if backend supports it
        // e.g. const res = await apiClient.post('/cart/verify', { items: items.map(i => i.productId) });
        // Update items in store if some are inactive
      } catch (err) {
        console.error('Failed to verify cart items', err);
      } finally {
        setCheckingAvailability(false);
      }
    };
    
    checkAvailability();
  }, [isMounted]); // intentional dependency, verify once when loaded

  if (!isMounted) return null;

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#FAF7F3] flex flex-col">
        <CartHeader />
        <div className="flex-1 flex flex-col pt-10">
          <EmptyCartState />
        </div>
      </main>
    );
  }

  const subtotal = getSubtotal();
  const hasInactiveItem = items.some(item => item.isAvailable === false);
  const isCheckoutDisabled = items.length === 0 || hasInactiveItem || checkingAvailability;

  return (
    <main className="min-h-screen bg-[#FAF7F3] flex flex-col">
      <CartHeader />
      
      <div className="flex-1 max-w-screen-xl mx-auto w-full p-4 space-y-6 pb-32">
        <BranchTableSummary 
          branchName="FNB Bến Thành" 
          orderType="DINE_IN" 
          tableName="T1-01" 
        />

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#6B625B] uppercase tracking-wider">Món đã chọn</h2>
          <div className="space-y-3">
            {items.map(item => (
              <CartItemRow 
                key={item.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>
        </div>

        <OrderNoteField note={orderNote} onChange={setOrderNote} />

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#6B625B] uppercase tracking-wider">Thanh toán</h2>
          <PriceSummary subtotal={subtotal} discount={0} />
        </div>
      </div>

      <CheckoutButton 
        isDisabled={isCheckoutDisabled}
        itemCount={getTotalItems()}
        totalAmount={subtotal}
      />

      <LoginRequiredModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        returnUrl="/checkout" 
      />
    </main>
  );
}
