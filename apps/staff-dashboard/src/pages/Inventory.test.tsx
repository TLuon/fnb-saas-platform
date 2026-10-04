// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient } from '@fnb/utils';
import Inventory from './Inventory';
import { useInventoryStore } from '../store/inventoryStore';
import { ModalProvider } from '../components/ModalProvider';

describe('Inventory create form', () => {
  beforeEach(() => {
    useInventoryStore.setState({
      ingredients: [],
      transactions: [],
      recipes: [],
      products: [],
      loading: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens the add modal and posts a valid ingredient payload', async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/inventory/ingredients') return [];
      if (url === '/inventory/transactions') return { data: [] };
      if (url === '/products') return [];
      return [];
    });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      id: 'ing-created',
      name: 'Codex UI Ingredient',
      sku: 'INV-UI-001',
      unit: 'g',
      current_stock: 7,
      min_stock_alert: 2,
      cost_per_unit: 3,
    } as any);

    render(<ModalProvider><Inventory /></ModalProvider>);

    await user.click(await screen.findByRole('button', { name: /\+ Thêm mới/i }));
    await user.type(screen.getByLabelText(/Tên nguyên vật liệu/i), 'Codex UI Ingredient');
    await user.type(screen.getByLabelText(/^SKU$/i), 'INV-UI-001');
    await user.clear(screen.getByLabelText(/Tồn kho hiện tại/i));
    await user.type(screen.getByLabelText(/Tồn kho hiện tại/i), '7');
    await user.type(screen.getByLabelText(/Tồn kho tối thiểu/i), '2');
    await user.type(screen.getByLabelText(/Giá vốn mỗi đơn vị/i), '3');
    await user.click(screen.getByRole('button', { name: /^Lưu$/i }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/inventory/ingredients', {
        name: 'Codex UI Ingredient',
        sku: 'INV-UI-001',
        unit: 'g',
        current_stock: 7,
        min_stock_alert: 2,
        cost_per_unit: 3,
      });
    });
    expect(getSpy).toHaveBeenCalledWith('/inventory/ingredients');
  });

  it('validates required fields before posting', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'get').mockResolvedValue([] as any);
    const postSpy = vi.spyOn(apiClient, 'post');

    render(<ModalProvider><Inventory /></ModalProvider>);

    await user.click(await screen.findByRole('button', { name: /\+ Thêm mới/i }));
    await user.clear(screen.getByLabelText(/Tên nguyên vật liệu/i));
    await user.click(screen.getByRole('button', { name: /^Lưu$/i }));

    expect(postSpy).not.toHaveBeenCalled();
  });
});
