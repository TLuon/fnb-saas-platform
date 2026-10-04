import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAnalyticsStore } from './analyticsStore';
import { apiClient } from '@fnb/utils';

describe('useAnalyticsStore', () => {
  beforeEach(() => {
    useAnalyticsStore.setState({
      dashboardData: null,
      revenueOrders: [],
      occupiedTablesList: [],
      loading: false,
      ordersLoading: false,
      tablesLoading: false,
      error: null,
      ordersError: null,
      tablesError: null,
    });
    vi.restoreAllMocks();
  });

  it('1. Branch UUID propagation: includes branch_id and period in request URL', async () => {
    const branchId = '22222222-2222-2222-2222-222222222222';
    const period = 'today';

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          revenue: 128000,
          orders_count: 3,
          occupied_tables: 1,
          average_order_value: 42667,
          revenue_trend: 100,
          orders_trend: 100,
          chart_data: [{ time: '16:00', revenue: 128000 }],
          top_products: [{ id: 'p-1', name: 'Bạc xỉu', quantity: 4, revenue: 128000 }],
          payment_breakdown: [{ method: 'Chuyển khoản / VietQR', amount: 128000, percentage: 100 }],
        },
      },
    } as any);

    await useAnalyticsStore.getState().fetchDashboard(branchId, period);

    expect(getSpy).toHaveBeenCalledWith(
      `/reports/dashboard?branch_id=${branchId}&period=${period}`,
    );

    const data = useAnalyticsStore.getState().dashboardData;
    expect(data?.revenue).toBe(128000);
    expect(data?.ordersCount).toBe(3);
    expect(data?.occupiedTables).toBe(1);
    expect(data?.averageOrderValue).toBe(42667);
    expect(data?.chartData).toEqual([{ time: '16:00', revenue: 128000 }]);
    expect(data?.topProducts).toHaveLength(1);
    expect(data?.paymentBreakdown).toHaveLength(1);
  });

  it('2. All-branches aggregation: omits branch_id when branchId is "all"', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          revenue: 128000,
          orders_count: 3,
          occupied_tables: 1,
          average_order_value: 42667,
        },
      },
    } as any);

    await useAnalyticsStore.getState().fetchDashboard('all', 'this_week');

    expect(getSpy).toHaveBeenCalledWith('/reports/dashboard?period=this_week');
    expect(getSpy).not.toHaveBeenCalledWith(expect.stringContaining('branch_id'));
  });

  it('3. Race condition protection: older response does not overwrite newer request', async () => {
    let resolveFirst: (val: any) => void;
    let resolveSecond: (val: any) => void;

    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise((resolve) => {
      resolveSecond = resolve;
    });

    vi.spyOn(apiClient, 'get')
      .mockReturnValueOnce(firstPromise as any)
      .mockReturnValueOnce(secondPromise as any);

    // User selects Q1 first
    const p1 = useAnalyticsStore.getState().fetchDashboard('22222222-2222-2222-2222-222222222222', 'today');
    // User rapidly switches to Q3
    const p2 = useAnalyticsStore.getState().fetchDashboard('22222222-2222-2222-2222-333333333333', 'today');

    // Second request finishes FIRST (fast)
    resolveSecond!({
      data: {
        success: true,
        data: {
          revenue: 0,
          orders_count: 0,
          occupied_tables: 0,
          average_order_value: 0,
        },
      },
    });
    await p2;

    expect(useAnalyticsStore.getState().dashboardData?.revenue).toBe(0);

    // First request finishes LATER (slow)
    resolveFirst!({
      data: {
        success: true,
        data: {
          revenue: 128000,
          orders_count: 3,
          occupied_tables: 1,
          average_order_value: 42667,
        },
      },
    });
    await p1;

    // The store must RETAIN the result of the second request (revenue: 0) and discard the stale first request!
    expect(useAnalyticsStore.getState().dashboardData?.revenue).toBe(0);
  });

  it('4. Error handling: captures error message', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValueOnce({
      response: { data: { message: 'Chi nhánh không hợp lệ' } },
    });

    await useAnalyticsStore.getState().fetchDashboard('invalid-id', 'today');

    expect(useAnalyticsStore.getState().loading).toBe(false);
    expect(useAnalyticsStore.getState().error).toBe('Chi nhánh không hợp lệ');
  });

  it('5. Revenue order details: maps customer, branch, table, items and amounts', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        data: [{
          id: 'order-1',
          order_code: 'ORD-001',
          order_type: 'DINE_IN',
          subtotal: '100000',
          discount_amount: '10000',
          final_amount: '90000',
          payment_method: 'VIETQR',
          created_at: '2026-09-24T09:00:00.000Z',
          customers: { full_name: 'Nguyễn An', email: 'an@example.com', phone: '0900000000' },
          branches: [{ name: 'Chi nhánh Quận 1' }],
          tables: { table_code: 'T1-01' },
          order_items: [{ id: 'item-1', product_name: 'Bạc xỉu', quantity: 2, unit_price: 50000 }],
        }],
      },
    } as any);

    await useAnalyticsStore.getState().fetchRevenueOrders('all', 'today');

    expect(apiClient.get).toHaveBeenCalledWith('/reports/orders?period=today');
    expect(useAnalyticsStore.getState().revenueOrders[0]).toMatchObject({
      id: 'order-1',
      customerName: 'Nguyễn An',
      branchName: 'Chi nhánh Quận 1',
      tableCode: 'T1-01',
      finalAmount: 90000,
      items: [{ productName: 'Bạc xỉu', quantity: 2, unitPrice: 50000 }],
    });
  });

  it('6. Malformed revenue response: clears stale orders and exposes an error', async () => {
    useAnalyticsStore.setState({ revenueOrders: [{ id: 'stale' } as any] });
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { unexpected: true } } as any);

    await useAnalyticsStore.getState().fetchRevenueOrders('all', 'today');

    expect(useAnalyticsStore.getState().revenueOrders).toEqual([]);
    expect(useAnalyticsStore.getState().ordersError).toBe('Dữ liệu giao dịch không đúng định dạng');
    expect(useAnalyticsStore.getState().ordersLoading).toBe(false);
  });

  it('7. fetchOccupiedTables: fetches tables from /reports/tables', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'tbl-1',
            table_code: 'Bàn 01',
            capacity: 4,
            status: 'OCCUPIED',
            floor_name: 'Tầng 1',
            branch_name: 'Chi nhánh Quận 1',
          },
        ],
      },
    } as any);

    await useAnalyticsStore.getState().fetchOccupiedTables('branch-1', 'OCCUPIED');

    expect(apiClient.get).toHaveBeenCalledWith('/reports/tables?branch_id=branch-1&status=OCCUPIED');
    expect(useAnalyticsStore.getState().occupiedTablesList).toHaveLength(1);
    expect(useAnalyticsStore.getState().occupiedTablesList[0].table_code).toBe('Bàn 01');
    expect(useAnalyticsStore.getState().tablesLoading).toBe(false);
  });

  it('8. updateTableStatus: updates table status via PATCH and updates local occupied count', async () => {
    useAnalyticsStore.setState({
      dashboardData: {
        revenue: 100000,
        ordersCount: 2,
        occupiedTables: 2,
        averageOrderValue: 50000,
        revenueTrend: 0,
        ordersTrend: 0,
        chartData: [],
        topProducts: [],
        paymentBreakdown: [],
        totalIngredientCost: 0,
      },

      occupiedTablesList: [
        { id: 'tbl-1', table_code: 'Bàn 01', capacity: 4, status: 'OCCUPIED' },
        { id: 'tbl-2', table_code: 'Bàn 02', capacity: 4, status: 'OCCUPIED' },
      ],
    });

    vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      data: { success: true },
    } as any);

    const ok = await useAnalyticsStore.getState().updateTableStatus('tbl-1', 'AVAILABLE');

    expect(ok).toBe(true);
    expect(apiClient.patch).toHaveBeenCalledWith('/tables/tbl-1/status', { status: 'AVAILABLE' });

    const state = useAnalyticsStore.getState();
    const updatedTable = state.occupiedTablesList.find((t) => t.id === 'tbl-1');
    expect(updatedTable?.status).toBe('AVAILABLE');
    // Occupied tables count should now be 1 (only tbl-2 is OCCUPIED)
    expect(state.dashboardData?.occupiedTables).toBe(1);
  });
});
