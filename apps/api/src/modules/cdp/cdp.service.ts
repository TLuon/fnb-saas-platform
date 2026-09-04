import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { CreateVoucherDto } from './dto/create-voucher.dto.js';

@Injectable()
export class CdpService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * API_CONTRACT.md mục 9 — GET /cdp/customers?segment=.
   * Gọi fn_list_customers_by_segment (004_cdp_functions.sql) — chạy
   * dưới quyền người gọi (SECURITY INVOKER mặc định) nên RLS
   * owner_support_customer_read vẫn áp dụng, không lộ khách tenant khác.
   */
  async listCustomersBySegment(accessToken: string, segment: string) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client.rpc('fn_list_customers_by_segment', {
      p_segment: segment,
    });

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data;
  }

  /**
   * API_CONTRACT.md mục 9 — GET /cdp/customers/:id/360.
   * GHI CHÚ GIỚI HẠN: cột customers.favorite_items hiện chưa có tiến
   * trình tự động điền (function fn_refresh_customer_favorite_items
   * được nhắc trong tài liệu nghiên cứu gốc KHÔNG nằm trong ERD.md mục
   * 3 chính thức) — trả nguyên trạng cột này (có thể rỗng []), team cần
   * quyết định có bổ sung tính năng này ở migration sau hay không.
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
    return data;
  }

  /** API_CONTRACT.md mục 9 — POST /cdp/customers/:id/vouchers (OWNER, SUPPORT). */
  async createVoucher(accessToken: string, customerId: string, dto: CreateVoucherDto) {
    if (!dto.discount_percent && !dto.free_item_product_id) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Cần ít nhất discount_percent hoặc free_item_product_id',
      );
    }

    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('customer_vouchers')
      .insert({
        customer_id: customerId,
        source: 'CHURN_REENGAGEMENT',
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
   * API_CONTRACT.md mục 9 — GET /reports/dashboard?branch_id=.
   * "Doanh thu tức thì" hiểu là doanh thu HÔM NAY — xem ghi chú giả
   * định trong 004_cdp_functions.sql.
   */
  async getDashboard(accessToken: string, branchId: string) {
    const client = this.supabase.forUser(accessToken);

    const [{ data: revenueToday, error: revenueError }, totalTablesRes, occupiedTablesRes, { data: topProducts, error: topProductsError }] =
      await Promise.all([
        client.rpc('fn_branch_revenue_today', { p_branch_id: branchId }),
        client
          .from('tables')
          .select('id, floors!inner(branch_id)', { count: 'exact', head: true })
          .eq('floors.branch_id', branchId),
        client
          .from('tables')
          .select('id, floors!inner(branch_id)', { count: 'exact', head: true })
          .eq('floors.branch_id', branchId)
          .eq('status', 'OCCUPIED'),
        client.rpc('fn_top_products', { p_branch_id: branchId, p_limit: 5 }),
      ]);

    if (revenueError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', revenueError.message);
    if (totalTablesRes.error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', totalTablesRes.error.message);
    if (occupiedTablesRes.error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', occupiedTablesRes.error.message);
    if (topProductsError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', topProductsError.message);

    const totalTables = totalTablesRes.count ?? 0;
    const occupiedTables = occupiedTablesRes.count ?? 0;

    return {
      revenue_today: revenueToday,
      occupancy_rate: totalTables > 0 ? Number((occupiedTables / totalTables).toFixed(4)) : 0,
      total_tables: totalTables,
      occupied_tables: occupiedTables,
      top_products: topProducts,
    };
  }
}
