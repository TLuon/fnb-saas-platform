import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { CreateVoucherDto } from './dto/create-voucher.dto.js';
import { AuthenticatedUser } from '../../common/types/auth.types.js';

function getPeriodBoundaries(period: string = 'today') {
  const now = new Date();
  // VN timezone offset is UTC+7
  const vnTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const vnYear = vnTime.getFullYear();
  const vnMonth = vnTime.getMonth();
  const vnDate = vnTime.getDate();
  const vnDay = vnTime.getDay(); // 0 is Sunday, 1 is Monday

  const createVnDate = (y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0) => {
    return new Date(Date.UTC(y, m, d, h - 7, min, s, ms));
  };

  let startDate: Date;
  let endDate: Date;
  let prevStartDate: Date;
  let prevEndDate: Date;

  if (period === 'yesterday') {
    startDate = createVnDate(vnYear, vnMonth, vnDate - 1, 0, 0, 0, 0);
    endDate = createVnDate(vnYear, vnMonth, vnDate - 1, 23, 59, 59, 999);
    prevStartDate = createVnDate(vnYear, vnMonth, vnDate - 2, 0, 0, 0, 0);
    prevEndDate = createVnDate(vnYear, vnMonth, vnDate - 2, 23, 59, 59, 999);
  } else if (period === 'this_week') {
    const diffToMonday = vnDay === 0 ? 6 : vnDay - 1;
    startDate = createVnDate(vnYear, vnMonth, vnDate - diffToMonday, 0, 0, 0, 0);
    endDate = createVnDate(vnYear, vnMonth, vnDate - diffToMonday + 6, 23, 59, 59, 999);
    prevStartDate = createVnDate(vnYear, vnMonth, vnDate - diffToMonday - 7, 0, 0, 0, 0);
    prevEndDate = createVnDate(vnYear, vnMonth, vnDate - diffToMonday - 1, 23, 59, 59, 999);
  } else if (period === 'this_month') {
    const lastDayOfMonth = new Date(vnYear, vnMonth + 1, 0).getDate();
    const lastDayOfPrevMonth = new Date(vnYear, vnMonth, 0).getDate();
    startDate = createVnDate(vnYear, vnMonth, 1, 0, 0, 0, 0);
    endDate = createVnDate(vnYear, vnMonth, lastDayOfMonth, 23, 59, 59, 999);
    prevStartDate = createVnDate(vnYear, vnMonth - 1, 1, 0, 0, 0, 0);
    prevEndDate = createVnDate(vnYear, vnMonth - 1, lastDayOfPrevMonth, 23, 59, 59, 999);
  } else {
    // Default: 'today'
    startDate = createVnDate(vnYear, vnMonth, vnDate, 0, 0, 0, 0);
    endDate = createVnDate(vnYear, vnMonth, vnDate, 23, 59, 59, 999);
    prevStartDate = createVnDate(vnYear, vnMonth, vnDate - 1, 0, 0, 0, 0);
    prevEndDate = createVnDate(vnYear, vnMonth, vnDate - 1, 23, 59, 59, 999);
  }

  return { startDate, endDate, prevStartDate, prevEndDate, vnYear, vnMonth, vnDate };
}

function buildChartData(
  period: string,
  orders: Array<{ created_at: string; final_amount: number }>,
  vnYear: number,
  vnMonth: number,
): Array<{ time: string; revenue: number }> {
  if (period === 'this_week') {
    const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    const map = new Map<string, number>(weekDays.map((d) => [d, 0]));
    for (const o of orders) {
      const orderDate = new Date(o.created_at);
      const vnDate = new Date(orderDate.getTime() + (7 * 60 + orderDate.getTimezoneOffset()) * 60000);
      const day = vnDate.getDay();
      const idx = day === 0 ? 6 : day - 1;
      const label = weekDays[idx];
      map.set(label, (map.get(label) || 0) + Number(o.final_amount || 0));
    }
    return Array.from(map.entries()).map(([time, revenue]) => ({ time, revenue }));
  }

  if (period === 'this_month') {
    const lastDay = new Date(vnYear, vnMonth + 1, 0).getDate();
    const map = new Map<string, number>();
    for (let d = 1; d <= lastDay; d++) {
      const label = `${String(d).padStart(2, '0')}/${String(vnMonth + 1).padStart(2, '0')}`;
      map.set(label, 0);
    }
    for (const o of orders) {
      const orderDate = new Date(o.created_at);
      const vnDate = new Date(orderDate.getTime() + (7 * 60 + orderDate.getTimezoneOffset()) * 60000);
      const label = `${String(vnDate.getDate()).padStart(2, '0')}/${String(vnDate.getMonth() + 1).padStart(2, '0')}`;
      if (map.has(label)) {
        map.set(label, (map.get(label) || 0) + Number(o.final_amount || 0));
      }
    }
    return Array.from(map.entries()).map(([time, revenue]) => ({ time, revenue }));
  }

  // 'today' or 'yesterday': 8 two-hour intervals
  const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  const map = new Map<string, number>(timeSlots.map((s) => [s, 0]));

  const getSlot = (hour: number) => {
    if (hour < 10) return '08:00';
    if (hour < 12) return '10:00';
    if (hour < 14) return '12:00';
    if (hour < 16) return '14:00';
    if (hour < 18) return '16:00';
    if (hour < 20) return '18:00';
    if (hour < 22) return '20:00';
    return '22:00';
  };

  for (const o of orders) {
    const orderDate = new Date(o.created_at);
    const vnDate = new Date(orderDate.getTime() + (7 * 60 + orderDate.getTimezoneOffset()) * 60000);
    const slot = getSlot(vnDate.getHours());
    map.set(slot, (map.get(slot) || 0) + Number(o.final_amount || 0));
  }

  return Array.from(map.entries()).map(([time, revenue]) => ({ time, revenue }));
}

@Injectable()
export class CdpService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * API_CONTRACT.md mục 9 — GET /cdp/customers?segment=.
   * Gọi fn_list_customers_by_segment (004_cdp_functions.sql) — chạy
   * dưới quyền người gọi (SECURITY INVOKER mặc định) nên RLS
   * owner_support_customer_read vẫn áp dụng, không lộ khách tenant khác.
   */
  async listCustomersBySegment(accessToken: string, segment?: string) {
    const client = this.supabase.forUser(accessToken);
    if (!segment || segment === 'ALL') {
      const { data, error } = await client
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
      return data ?? [];
    }

    const { data, error } = await client.rpc('fn_list_customers_by_segment', {
      p_segment: segment,
    });

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data ?? [];
  }

  /**
   * API_CONTRACT.md mục 9 — GET /cdp/customers/:id/360.
   */
  async getCustomer360(accessToken: string, customerId: string) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('customers')
      .select(
        'id, full_name, email, phone, membership_tier, loyalty_points, total_spent, total_visits, first_visit_at, last_visit_at, favorite_items, dietary_notes',
      )
      .eq('id', customerId)
      .maybeSingle();

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    if (!data) throw new NotFoundException('Không tìm thấy khách hàng');

    const { data: orders } = await client
      .from('orders')
      .select('id, created_at, final_amount, status, branches(name)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: reservations } = await client
      .from('reservations')
      .select('id, reservation_code, reservation_time, guest_count, status')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      ...data,
      order_history: (orders || []).map((o: any) => ({
        id: o.id,
        date: o.created_at,
        amount: o.final_amount,
        branch: o.branches?.name || 'Chi nhánh',
        status: o.status
      })),
      reservation_history: (reservations || []).map(r => ({
        id: r.id,
        code: r.reservation_code,
        date: r.reservation_time,
        guests: r.guest_count,
        status: r.status
      }))
    };
  }

  /** API_CONTRACT.md mục 9 — POST /cdp/customers/:id/vouchers (OWNER, SUPPORT). */
  async createVoucher(user: AuthenticatedUser, customerId: string, dto: CreateVoucherDto) {
    if (!dto.discount_percent && !dto.free_item_product_id) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Cần ít nhất discount_percent hoặc free_item_product_id',
      );
    }

    const admin = this.supabase.admin();
    const { data: customer, error: customerError } = await admin
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (customerError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', customerError.message);
    }
    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng trong tenant hiện tại');
    }

    if (dto.free_item_product_id) {
      const { data: product, error: productError } = await admin
        .from('products')
        .select('id')
        .eq('id', dto.free_item_product_id)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle();

      if (productError) {
        throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', productError.message);
      }
      if (!product) {
        throw new AppException('ERR_9001_VALIDATION_FAILED', 'Sản phẩm tặng không thuộc tenant hiện tại');
      }
    }

    // Authorization and tenant ownership are verified above. The service client is
    // required here because some deployed databases do not yet have migration 006.
    const { data, error } = await admin
      .from('customer_vouchers')
      .insert({
        customer_id: customerId,
        source: 'MANUAL',
        discount_percent: dto.discount_percent,
        free_item_product_id: dto.free_item_product_id,
        expires_at: dto.expires_at,
      })
      .select()
      .single();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    return data;
  }

  /**
   * API_CONTRACT.md mục 9 — GET /reports/dashboard?branch_id=&period=.
   * Báo cáo kinh doanh tổng hợp: Doanh thu, Đơn hàng, Giá trị TB/Đơn,
   * Bàn đang phục vụ, Biểu đồ doanh thu thực tế, Món bán chạy, Tỷ lệ thanh toán.
   */
  async getDashboard(
    accessToken: string,
    user: AuthenticatedUser,
    branchId?: string,
    period: string = 'today',
  ) {
    const client = this.supabase.forUser(accessToken);

    // 1. Validate branch_id belongs to authenticated user's tenant
    if (branchId) {
      const { data: branch, error: branchErr } = await client
        .from('branches')
        .select('id, tenant_id')
        .eq('id', branchId)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle();

      if (branchErr || !branch) {
        throw new AppException(
          'ERR_9001_VALIDATION_FAILED',
          'Chi nhánh không hợp lệ hoặc không thuộc cửa hàng của bạn',
        );
      }
    }

    // 2. Date ranges
    const { startDate, endDate, prevStartDate, prevEndDate, vnYear, vnMonth } = getPeriodBoundaries(period);

    // 3. Current period orders (COMPLETED)
    let ordersQuery = client
      .from('orders')
      .select('id, tenant_id, branch_id, status, final_amount, payment_method, created_at')
      .eq('tenant_id', user.tenant_id)
      .eq('status', 'COMPLETED')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (branchId) {
      ordersQuery = ordersQuery.eq('branch_id', branchId);
    }

    ordersQuery = ordersQuery.order('created_at', { ascending: true });

    // 4. Previous period orders (for trend calculation)
    let prevOrdersQuery = client
      .from('orders')
      .select('id, final_amount')
      .eq('tenant_id', user.tenant_id)
      .eq('status', 'COMPLETED')
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString());

    if (branchId) {
      prevOrdersQuery = prevOrdersQuery.eq('branch_id', branchId);
    }

    // 5. Tables query
    let tablesQuery = client
      .from('tables')
      .select('id, status, floors!inner(branch_id)');

    if (branchId) {
      tablesQuery = tablesQuery.eq('floors.branch_id', branchId);
    }

    const [ordersRes, prevOrdersRes, tablesRes] = await Promise.all([
      ordersQuery,
      prevOrdersQuery,
      tablesQuery,
    ]);

    if (ordersRes.error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', ordersRes.error.message);
    if (prevOrdersRes.error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', prevOrdersRes.error.message);
    if (tablesRes.error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', tablesRes.error.message);

    const ordersList = ordersRes.data || [];
    const ordersCount = ordersList.length;
    const totalRevenue = ordersList.reduce((sum, o) => sum + Number(o.final_amount || 0), 0);
    const averageOrderValue = ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;

    const prevOrdersList = prevOrdersRes.data || [];
    const prevOrdersCount = prevOrdersList.length;
    const prevRevenue = prevOrdersList.reduce((sum, o) => sum + Number(o.final_amount || 0), 0);

    const revenueTrend = prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
      : (totalRevenue > 0 ? 100 : 0);

    const ordersTrend = prevOrdersCount > 0
      ? Math.round(((ordersCount - prevOrdersCount) / prevOrdersCount) * 100)
      : (ordersCount > 0 ? 100 : 0);

    const tablesList = tablesRes.data || [];
    const totalTables = tablesList.length;
    const occupiedTables = tablesList.filter((t) => t.status === 'OCCUPIED').length;
    const occupancyRate = totalTables > 0 ? Number((occupiedTables / totalTables).toFixed(4)) : 0;

    // 6. Top products
    let topProducts: Array<{ id: string; name: string; quantity: number; revenue: number }> = [];
    if (ordersList.length > 0) {
      const orderIds = ordersList.map((o) => o.id);
      const { data: itemsData, error: itemsErr } = await client
        .from('order_items')
        .select('product_id, product_name, quantity, unit_price')
        .in('order_id', orderIds);

      if (itemsErr) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', itemsErr.message);

      const productMap = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();
      for (const item of itemsData || []) {
        const key = item.product_id || item.product_name;
        const existing = productMap.get(key) || {
          id: item.product_id || key,
          name: item.product_name || 'Món',
          quantity: 0,
          revenue: 0,
        };
        const qty = Number(item.quantity || 0);
        const price = Number(item.unit_price || 0);
        existing.quantity += qty;
        existing.revenue += qty * price;
        productMap.set(key, existing);
      }

      topProducts = Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    }

    // 7. Payment breakdown
    const paymentMap = new Map<string, number>();
    for (const o of ordersList) {
      const method = o.payment_method || 'OTHER';
      paymentMap.set(method, (paymentMap.get(method) || 0) + Number(o.final_amount || 0));
    }

    const METHOD_NAMES: Record<string, string> = {
      VIETQR: 'Chuyển khoản / VietQR',
      WALLET: 'Ví F&B',
      COFFEE_PASS: 'Coffee Pass',
      CASH: 'Tiền mặt',
      CARD: 'Thẻ',
      OTHER: 'Khác',
    };

    const paymentBreakdown = Array.from(paymentMap.entries()).map(([method, amount]) => ({
      method: METHOD_NAMES[method] || method,
      amount,
      percentage: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0,
    }));

    // 8. Real chart data
    const chartData = buildChartData(period, ordersList, vnYear, vnMonth);

    // 9. Total ingredient cost from inventory_transactions (type = 'IN')
    let inventoryQuery = client
      .from('inventory_transactions')
      .select('quantity, unit_price, total_cost')
      .eq('tenant_id', user.tenant_id)
      .eq('type', 'IN')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (branchId) {
      inventoryQuery = inventoryQuery.eq('branch_id', branchId);
    }

    const { data: invTxList } = await inventoryQuery;
    const totalIngredientCost = (invTxList || []).reduce((acc: number, tx: any) => {
      const cost = Number(tx.total_cost ?? (Number(tx.quantity || 0) * Number(tx.unit_price || 0)));
      return acc + cost;
    }, 0);

    return {
      revenue_today: totalRevenue,
      revenue: totalRevenue,
      orders_count: ordersCount,
      occupied_tables: occupiedTables,
      total_tables: totalTables,
      occupancy_rate: occupancyRate,
      average_order_value: averageOrderValue,
      total_ingredient_cost: totalIngredientCost,
      revenue_trend: revenueTrend,
      orders_trend: ordersTrend,
      chart_data: chartData,
      top_products: topProducts,
      payment_breakdown: paymentBreakdown,
    };
  }

  /** Completed orders behind the revenue KPIs, scoped to the same branch and period. */
  async getRevenueOrders(
    accessToken: string,
    user: AuthenticatedUser,
    branchId?: string,
    period: string = 'today',
  ) {
    const client = this.supabase.forUser(accessToken);

    if (branchId) {
      const { data: branch, error: branchError } = await client
        .from('branches')
        .select('id')
        .eq('id', branchId)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle();

      if (branchError || !branch) {
        throw new AppException(
          'ERR_9001_VALIDATION_FAILED',
          'Chi nhánh không hợp lệ hoặc không thuộc cửa hàng của bạn',
        );
      }
    }

    const { startDate, endDate } = getPeriodBoundaries(period);
    let ordersQuery = client
      .from('orders')
      .select(`
        id,
        order_code,
        branch_id,
        table_id,
        customer_id,
        order_type,
        status,
        subtotal,
        discount_amount,
        final_amount,
        payment_method,
        created_at,
        customers ( id, full_name, email, phone ),
        branches ( id, name ),
        tables ( id, table_code ),
        order_items ( id, product_name, quantity, unit_price, modifiers )
      `)
      .eq('tenant_id', user.tenant_id)
      .eq('status', 'COMPLETED')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (branchId) {
      ordersQuery = ordersQuery.eq('branch_id', branchId);
    }

    const { data, error } = await ordersQuery.order('created_at', { ascending: false });
    if (error) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    }

    return data ?? [];
  }

  /**
   * Lấy danh sách các bàn đang phục vụ (hoặc theo status), kèm thông tin tầng, chi nhánh và đơn hàng hiện tại
   */
  async getOccupiedTables(
    accessToken: string,
    user: AuthenticatedUser,
    branchId?: string,
    status?: string,
  ) {
    const client = this.supabase.forUser(accessToken);

    if (branchId && branchId !== 'all') {
      const { data: branch, error: branchError } = await client
        .from('branches')
        .select('id')
        .eq('id', branchId)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle();

      if (branchError || !branch) {
        throw new AppException(
          'ERR_9001_VALIDATION_FAILED',
          'Chi nhánh không hợp lệ hoặc không thuộc cửa hàng của bạn',
        );
      }
    }

    let tablesQuery = client
      .from('tables')
      .select(`
        id,
        table_code,
        capacity,
        status,
        current_order_id,
        updated_at,
        floor_id,
        floors!inner (
          id,
          name,
          branch_id,
          branches!inner (
            id,
            name
          )
        )
      `);

    if (status && status !== 'all') {
      tablesQuery = tablesQuery.eq('status', status);
    } else if (!status) {
      tablesQuery = tablesQuery.eq('status', 'OCCUPIED');
    }

    if (branchId && branchId !== 'all') {
      tablesQuery = tablesQuery.eq('floors.branch_id', branchId);
    }

    const { data: tablesData, error } = await tablesQuery.order('table_code', { ascending: true });
    if (error) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    }

    const list = tablesData || [];
    const orderIds = list.map((t: any) => t.current_order_id).filter(Boolean);
    const orderMap = new Map<string, any>();
    if (orderIds.length > 0) {
      const { data: orders } = await client
        .from('orders')
        .select('id, order_code, order_type, final_amount, status, created_at')
        .in('id', orderIds);
      if (orders) {
        for (const ord of orders) {
          orderMap.set(ord.id, ord);
        }
      }
    }

    return list.map((t: any) => {
      const floor = Array.isArray(t.floors) ? t.floors[0] : t.floors;
      const branch = floor ? (Array.isArray(floor.branches) ? floor.branches[0] : floor.branches) : null;
      const order = t.current_order_id ? orderMap.get(t.current_order_id) || null : null;
      return {
        id: t.id,
        table_code: t.table_code,
        capacity: t.capacity,
        status: t.status,
        floor_id: floor?.id || t.floor_id,
        floor_name: floor?.name || 'Tầng',
        branch_id: branch?.id || floor?.branch_id,
        branch_name: branch?.name || 'Chi nhánh',
        current_order_id: t.current_order_id || null,
        order: order
          ? {
              id: order.id,
              order_code: order.order_code,
              order_type: order.order_type,
              final_amount: Number(order.final_amount || 0),
              status: order.status,
              created_at: order.created_at,
            }
          : null,
        updated_at: t.updated_at,
      };
    });
  }
}
