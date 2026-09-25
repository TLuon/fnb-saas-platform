// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OccupiedTablesModal } from './OccupiedTablesModal';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { apiClient } from '@fnb/utils';

describe('OccupiedTablesModal', () => {
  beforeEach(() => {
    useAnalyticsStore.setState({
      occupiedTablesList: [
        {
          id: 'table-1',
          table_code: 'Bàn 01',
          capacity: 4,
          status: 'OCCUPIED',
          floor_name: 'Tầng 1',
          branch_name: 'Chi nhánh Quận 1',
          current_order_id: 'order-1',
          order: {
            id: 'order-1',
            order_code: 'ORD-1234',
            order_type: 'DINE_IN',
            final_amount: 120000,
            status: 'PREPARING',
            created_at: '2026-09-24T14:30:00Z',
          },
        },
      ],
      tablesLoading: false,
      tablesError: null,
      dashboardData: {
        revenue: 120000,
        ordersCount: 1,
        occupiedTables: 1,
        averageOrderValue: 120000,
        revenueTrend: 0,
        ordersTrend: 0,
        chartData: [],
        topProducts: [],
        paymentBreakdown: [],
      },
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders modal with occupied table details and order info', () => {
    render(
      <OccupiedTablesModal
        isOpen={true}
        onClose={vi.fn()}
        branchId="all"
      />
    );

    expect(screen.getByText('Danh sách bàn đang phục vụ')).toBeTruthy();
    expect(screen.getByText('Bàn 01')).toBeTruthy();
    expect(screen.getByText(/Chi nhánh Quận 1 • Tầng 1/i)).toBeTruthy();
    expect(screen.getByText(/ORD-1234/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Khách đã rời/i })).toBeTruthy();
  });

  it('calls updateTableStatus to set table to AVAILABLE when clicking "Khách đã rời (Hết dùng)"', async () => {
    const patchSpy = vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      data: { success: true },
    } as any);

    const onTableUpdated = vi.fn();

    render(
      <OccupiedTablesModal
        isOpen={true}
        onClose={vi.fn()}
        branchId="all"
        onTableUpdated={onTableUpdated}
      />
    );

    const releaseButton = screen.getByRole('button', { name: /Khách đã rời/i });
    fireEvent.click(releaseButton);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/tables/table-1/status', { status: 'AVAILABLE' });
    });

    await waitFor(() => {
      expect(screen.getByText(/Đã cập nhật Bàn 01 thành Bàn trống/i)).toBeTruthy();
    });

    expect(onTableUpdated).toHaveBeenCalled();
  });
});
