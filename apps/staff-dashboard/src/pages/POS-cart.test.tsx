// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import POS from './POS';
import { MemoryRouter } from 'react-router-dom';
import { ModalProvider } from '../components/ModalProvider';
import { apiClient } from '@fnb/utils';

describe('POS Cart & Payment Modal State Preservation (BUG-03 Regression Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/categories')) {
        return [{ id: 'cat-1', name: 'Đồ ăn' }];
      }
      if (url.includes('/products')) {
        return [
          {
            id: 'prod-lobster',
            name: 'Cheese-baked Lobster',
            price: 200000,
            category_id: 'cat-1',
            is_active: true,
            image_url: '',
          },
          {
            id: 'prod-drink',
            name: 'Trà đào',
            price: 50000,
            category_id: 'cat-1',
            is_active: true,
            image_url: '',
          },
        ];
      }
      if (url.includes('/floors') && !url.includes('/tables') && !url.includes('/canvas')) {
        return [{ id: 'floor-1', name: 'Tầng 1' }];
      }
      if (url.includes('/tables') || url.includes('/canvas')) {
        return [
          {
            id: 'table-b08',
            name: 'B08',
            table_number: 8,
            status: 'AVAILABLE',
            current_order_id: null,
            capacity: 4,
          },
        ];
      }
      if (url.includes('/branches')) {
        return [{ id: '22222222-2222-2222-2222-222222222222', name: 'Chi nhánh Quận 1' }];
      }
      if (url.includes('/reservations')) {
        return [];
      }
      return [];
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('REG-CART-01: Thêm 1 món 200k rồi mở/đóng modal -> Vẫn 200k, không nhân đôi', async () => {
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <ModalProvider>
          <POS />
        </ModalProvider>
      </MemoryRouter>
    );

    // Wait for product to appear
    await waitFor(() => {
      expect(screen.getByText('Cheese-baked Lobster')).toBeDefined();
    });

    // Click product to open modifier modal
    fireEvent.click(screen.getByText('Cheese-baked Lobster'));

    // In modifier modal, click "Thêm vào giỏ"
    await waitFor(() => {
      expect(screen.getByText('Thêm vào giỏ')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Thêm vào giỏ'));

    // Total should show 200.000đ
    await waitFor(() => {
      const amounts = screen.getAllByText('200.000đ');
      expect(amounts.length).toBeGreaterThan(0);
    });

    // Click "Thanh Toán"
    const checkoutBtn = screen.getByRole('button', { name: /Thanh Toán/i });
    fireEvent.click(checkoutBtn);

    // Modal opens showing "Thanh toán Đơn hàng"
    await waitFor(() => {
      expect(screen.getByText(/Thanh toán Đơn hàng/i)).toBeDefined();
    });

    // Click 'Đóng' to close payment modal
    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeBtn);

    // Verify modal is closed
    await waitFor(() => {
      expect(screen.queryByText(/Chuyển khoản \(QR\)/i)).toBeNull();
    });

    // Total must still be 200.000đ and NOT 400.000đ!
    expect(screen.queryByText('400.000đ')).toBeNull();
    expect(screen.queryByText('Đơn hiện tại')).toBeNull();
  });

  it('REG-CART-02: Mở/đóng Payment Modal 5 lần liên tiếp -> Tổng tiền vẫn giữ nguyên 200k', async () => {
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <ModalProvider>
          <POS />
        </ModalProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cheese-baked Lobster')).toBeDefined();
    });

    // Add Cheese-baked Lobster
    fireEvent.click(screen.getByText('Cheese-baked Lobster'));
    await waitFor(() => {
      expect(screen.getByText('Thêm vào giỏ')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Thêm vào giỏ'));

    const checkoutBtn = screen.getByRole('button', { name: /Thanh Toán/i });

    // Open and close modal 5 times
    for (let i = 0; i < 5; i++) {
      fireEvent.click(checkoutBtn);
      await waitFor(() => {
        expect(screen.getByText(/Thanh toán Đơn hàng/i)).toBeDefined();
      });
      const closeBtn = screen.getByRole('button', { name: 'Đóng' });
      fireEvent.click(closeBtn);
      await waitFor(() => {
        expect(screen.queryByText(/Chuyển khoản \(QR\)/i)).toBeNull();
      });
      // Verify no duplication after each cycle
      expect(screen.queryByText('400.000đ')).toBeNull();
      expect(screen.queryByText('Đơn hiện tại')).toBeNull();
    }
  });

  it('REG-CART-03: Đóng modal rồi thêm món mới 50k -> Tổng tiền đúng 250k', async () => {
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <ModalProvider>
          <POS />
        </ModalProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cheese-baked Lobster')).toBeDefined();
      expect(screen.getByText('Trà đào')).toBeDefined();
    });

    // Add Cheese-baked Lobster (200k)
    fireEvent.click(screen.getByText('Cheese-baked Lobster'));
    await waitFor(() => {
      expect(screen.getByText('Thêm vào giỏ')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Thêm vào giỏ'));

    // Open & close modal
    const checkoutBtn = screen.getByRole('button', { name: /Thanh Toán/i });
    fireEvent.click(checkoutBtn);
    await waitFor(() => {
      expect(screen.getByText(/Thanh toán Đơn hàng/i)).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await waitFor(() => {
      expect(screen.queryByText(/Chuyển khoản \(QR\)/i)).toBeNull();
    });

    // Add Trà đào (50k)
    fireEvent.click(screen.getByText('Trà đào'));
    await waitFor(() => {
      expect(screen.getByText('Thêm vào giỏ')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Thêm vào giỏ'));

    // Total must be 250.000đ
    await waitFor(() => {
      const amounts = screen.getAllByText(/250\.000/);
      expect(amounts.length).toBeGreaterThan(0);
    });
  });

  it('REG-CART-08: Đơn Mang đi (TAKEAWAY) đóng modal không mất giỏ và không nhân đôi', async () => {
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <ModalProvider>
          <POS />
        </ModalProvider>
      </MemoryRouter>
    );

    // Switch to Mang đi
    const takeawayTab = screen.getByRole('button', { name: /🥡 Mang đi/i });
    fireEvent.click(takeawayTab);

    // Add Cheese-baked Lobster
    await waitFor(() => {
      expect(screen.getByText('Cheese-baked Lobster')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Cheese-baked Lobster'));
    await waitFor(() => {
      expect(screen.getByText('Thêm vào giỏ')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Thêm vào giỏ'));

    // Click Thanh Toán
    const checkoutBtn = screen.getByRole('button', { name: /Thanh Toán/i });
    fireEvent.click(checkoutBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText(/Thanh toán Đơn hàng/i)).toBeDefined();
    });

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));

    // Item must remain in cart
    await waitFor(() => {
      expect(screen.getAllByText('Cheese-baked Lobster').length).toBeGreaterThan(1);
      expect(screen.queryByText('400.000đ')).toBeNull();
    });
  });
});
