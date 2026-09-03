import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { RealtimeGateway } from '../../common/realtime/realtime.gateway.js';
import { SubmitCsatDto } from './dto/submit-csat.dto.js';
import { ProposeMatchDto } from './dto/propose-match.dto.js';
import { ResolveTicketDto } from './dto/resolve-ticket.dto.js';
import { MergeCustomersDto } from './dto/merge-customers.dto.js';

@Injectable()
export class SupportService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  // ─────────────────────────────────────────────
  // POST /support/csat
  // ─────────────────────────────────────────────
  async submitCsat(user: AuthenticatedUser, accessToken: string, dto: SubmitCsatDto) {
    const supabase = this.supabaseService.forUser(accessToken);

    // 1. Verify order exists and belongs to tenant
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, status')
      .eq('id', dto.order_id)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (orderError || !order) {
      throw new AppException('ERR_4001_ORDER_NOT_FOUND', 'Order không tồn tại');
    }

    // 2. Check CSAT not already submitted for this order
    const { data: existing } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('order_id', dto.order_id)
      .maybeSingle();

    if (existing) {
      throw new AppException('ERR_6005_CSAT_ALREADY_SUBMITTED', 'Order này đã được đánh giá CSAT trước đó');
    }

    // 3. Resolve customer_id from authenticated user (if CUSTOMER role)
    let customerId: string | null = order.customer_id ?? null;
    if (user.role_app === 'CUSTOMER' && !customerId) {
      // ISSUE 4 FIX: Phải filter theo cả auth_user_id + tenant_id
      // Nếu user có customer profile ở nhiều tenant, .single() sẽ lỗi nếu thiếu tenant filter
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('auth_user_id', user.sub)
        .eq('tenant_id', user.tenant_id)
        .single();
      customerId = customer?.id ?? null;
    }

    // 4. Determine priority
    const priority = dto.score <= 2 ? 'URGENT' : 'NORMAL';

    // 5. Insert support_ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        tenant_id: user.tenant_id,
        order_id: dto.order_id,
        customer_id: customerId,
        csat_score: dto.score,
        complaint_note: dto.complaint_note ?? null,
        priority,
        status: 'OPEN'
      })
      .select('id, order_id, csat_score, complaint_note, priority, status, created_at')
      .single();

    if (ticketError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi tạo support ticket');
    }

    // 6. Emit realtime nếu URGENT — REALTIME_EVENTS.md #2.6
    if (priority === 'URGENT') {
      this.realtimeGateway.emitSupportTicketUrgent(user.tenant_id, {
        ticket_id: ticket.id,
        order_id: dto.order_id,
        csat_score: dto.score,
        complaint_note: dto.complaint_note ?? null
      });
    }

    return { message: 'Gửi đánh giá thành công', ticket };
  }

  // ─────────────────────────────────────────────
  // GET /support/unmatched
  // ─────────────────────────────────────────────
  async listUnmatched(
    user: AuthenticatedUser,
    accessToken: string,
    page: number = 1,
    limit: number = 20
  ) {
    const supabase = this.supabaseService.forUser(accessToken);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('unmatched_transactions')
      .select(
        `id, status, similarity_score, maker_user_id, maker_proposed_at, checker_user_id, checker_approved_at, created_at,
         payment_transactions!inner(id, amount, raw_transfer_content, tenant_id, created_at)`,
        { count: 'exact' }
      )
      .eq('payment_transactions.tenant_id', user.tenant_id)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi lấy danh sách unmatched transactions');
    }

    return {
      data,
      meta: { total: count ?? 0, page, limit }
    };
  }

  // ─────────────────────────────────────────────
  // GET /support/unmatched/:id/suggest
  // ─────────────────────────────────────────────
  async suggestMatch(user: AuthenticatedUser, accessToken: string, unmatchedId: string) {
    const supabase = this.supabaseService.forUser(accessToken);

    // 1. Get unmatched transaction
    const { data: unmatched, error: unmatchedError } = await supabase
      .from('unmatched_transactions')
      .select(
        `id, payment_transactions!inner(id, raw_transfer_content, tenant_id)`
      )
      .eq('id', unmatchedId)
      .single();

    if (unmatchedError || !unmatched) {
      throw new AppException('ERR_6001_UNMATCHED_TX_NOT_FOUND', 'Unmatched transaction không tồn tại');
    }

    const paymentTx = (unmatched as any).payment_transactions;
    if (paymentTx.tenant_id !== user.tenant_id) {
      throw new AppException('ERR_1003_TENANT_MISMATCH', 'Không có quyền truy cập');
    }

    const rawContent: string = paymentTx.raw_transfer_content ?? '';

    // 2. Call fn_suggest_customer_match — ERD.md mục 3.2
    // Using supabaseAdmin for RPC since fn_suggest_customer_match is SECURITY INVOKER (stable SQL)
    const { data: suggestions, error: rpcError } = await supabase.rpc('fn_suggest_customer_match', {
      p_transfer_content: rawContent,
      p_tenant_id: user.tenant_id
    });

    if (rpcError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi gọi fuzzy matching function');
    }

    return { suggestions: suggestions ?? [] };
  }

  // ─────────────────────────────────────────────
  // POST /support/unmatched/:id/propose (Maker)
  // ─────────────────────────────────────────────
  async proposeMatch(
    user: AuthenticatedUser,
    accessToken: string,
    unmatchedId: string,
    dto: ProposeMatchDto
  ) {
    const supabase = this.supabaseService.forUser(accessToken);

    // 1. Resolve maker's users.id from auth_user_id
    const { data: makerUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.sub)
      .single();

    if (!makerUser) {
      throw new AppException('ERR_1001_UNAUTHORIZED', 'Không tìm thấy user trong hệ thống');
    }

    // 2. Get unmatched transaction & verify tenant
    const { data: unmatched, error: unmatchedError } = await supabase
      .from('unmatched_transactions')
      .select(`id, status, payment_transactions!inner(tenant_id)`)
      .eq('id', unmatchedId)
      .single();

    if (unmatchedError || !unmatched) {
      throw new AppException('ERR_6001_UNMATCHED_TX_NOT_FOUND', 'Unmatched transaction không tồn tại');
    }

    const paymentTx = (unmatched as any).payment_transactions;
    if (paymentTx.tenant_id !== user.tenant_id) {
      throw new AppException('ERR_1003_TENANT_MISMATCH', 'Không có quyền truy cập');
    }

    // 3. Validate customer candidate exists and belongs to tenant
    const { data: candidate } = await supabase
      .from('customers')
      .select('id')
      .eq('id', dto.customer_id)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (!candidate) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Customer đề xuất không tồn tại trong tenant');
    }

    // 4. Update: set PROPOSED + maker info
    const { data: updated, error: updateError } = await supabase
      .from('unmatched_transactions')
      .update({
        status: 'PROPOSED',
        suggested_customer_id: dto.customer_id,
        maker_user_id: makerUser.id,
        maker_proposed_at: new Date().toISOString()
      })
      .eq('id', unmatchedId)
      .select('id, status, suggested_customer_id, maker_user_id, maker_proposed_at')
      .single();

    if (updateError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi cập nhật đề xuất');
    }

    // 5. Audit log
    const supabaseAdmin = this.supabaseService.admin();
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: user.tenant_id,
      actor_user_id: makerUser.id,
      action: 'PROPOSE_CUSTOMER_MATCH',
      entity_type: 'unmatched_transactions',
      entity_id: unmatchedId,
      metadata: { suggested_customer_id: dto.customer_id }
    });

    return { message: 'Đề xuất khớp khách thành công', data: updated };
  }

  // ─────────────────────────────────────────────
  // POST /support/unmatched/:id/approve (Checker)
  // ─────────────────────────────────────────────
  async approveMatch(user: AuthenticatedUser, accessToken: string, unmatchedId: string) {
    const supabase = this.supabaseService.forUser(accessToken);

    // 1. Resolve checker's users.id
    const { data: checkerUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.sub)
      .single();

    if (!checkerUser) {
      throw new AppException('ERR_1001_UNAUTHORIZED', 'Không tìm thấy user trong hệ thống');
    }

    // 2. Get unmatched with all required fields
    const { data: unmatched, error: unmatchedError } = await supabase
      .from('unmatched_transactions')
      .select(
        `id, status, maker_user_id, suggested_customer_id,
         payment_transactions!inner(id, tenant_id, amount, order_id)`
      )
      .eq('id', unmatchedId)
      .single();

    if (unmatchedError || !unmatched) {
      throw new AppException('ERR_6001_UNMATCHED_TX_NOT_FOUND', 'Unmatched transaction không tồn tại');
    }

    const paymentTx = (unmatched as any).payment_transactions;
    if (paymentTx.tenant_id !== user.tenant_id) {
      throw new AppException('ERR_1003_TENANT_MISMATCH', 'Không có quyền truy cập');
    }

    // 3. Enforce Maker-Checker: cấm self-approval
    if (unmatched.maker_user_id === checkerUser.id) {
      throw new AppException('ERR_6002_SELF_APPROVAL', 'Không thể tự phê duyệt đề xuất của chính mình');
    }

    if (unmatched.status !== 'PROPOSED') {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Unmatched transaction chưa có đề xuất hoặc đã được xử lý');
    }

    // 4. Mark as APPROVED
    const { error: updateError } = await supabase
      .from('unmatched_transactions')
      .update({
        status: 'APPROVED',
        checker_user_id: checkerUser.id,
        checker_approved_at: new Date().toISOString()
      })
      .eq('id', unmatchedId);

    if (updateError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi phê duyệt match');
    }

    // 5. Update payment_transaction: set matched_customer_id & status = MATCHED
    if (paymentTx.id && unmatched.suggested_customer_id) {
      await supabase
        .from('payment_transactions')
        .update({
          matched_customer_id: unmatched.suggested_customer_id,
          status: 'MATCHED'
        })
        .eq('id', paymentTx.id);
    }

    // 6. Audit log
    const supabaseAdmin = this.supabaseService.admin();
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: user.tenant_id,
      actor_user_id: checkerUser.id,
      action: 'APPROVE_CUSTOMER_MATCH',
      entity_type: 'unmatched_transactions',
      entity_id: unmatchedId,
      metadata: {
        maker_user_id: unmatched.maker_user_id,
        suggested_customer_id: unmatched.suggested_customer_id,
        payment_transaction_id: paymentTx.id
      }
    });

    return { message: 'Phê duyệt khớp khách thành công' };
  }

  // ─────────────────────────────────────────────
  // GET /support/tickets
  // ─────────────────────────────────────────────
  async listTickets(
    user: AuthenticatedUser,
    accessToken: string,
    page: number = 1,
    limit: number = 20
  ) {
    const supabase = this.supabaseService.forUser(accessToken);
    const offset = (page - 1) * limit;

    // URGENT tickets first, then by created_at desc
    const { data, error, count } = await supabase
      .from('support_tickets')
      .select(
        'id, order_id, customer_id, csat_score, complaint_note, priority, status, assigned_to, resolution_note, created_at',
        { count: 'exact' }
      )
      .eq('tenant_id', user.tenant_id)
      .order('priority', { ascending: false }) // URGENT > NORMAL alphabetically; for explicit ordering use a custom sort
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi lấy danh sách tickets');
    }

    // Sort so URGENT always first regardless of alphabetical ordering
    const sorted = (data ?? []).sort((a: any, b: any) => {
      if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1;
      if (a.priority !== 'URGENT' && b.priority === 'URGENT') return 1;
      return 0;
    });

    return {
      data: sorted,
      meta: { total: count ?? 0, page, limit }
    };
  }

  // ─────────────────────────────────────────────
  // POST /support/tickets/:id/resolve
  // ─────────────────────────────────────────────
  async resolveTicket(
    user: AuthenticatedUser,
    accessToken: string,
    ticketId: string,
    dto: ResolveTicketDto
  ) {
    const supabase = this.supabaseService.forUser(accessToken);

    // 1. Resolve staff user id
    const { data: staffUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.sub)
      .single();

    if (!staffUser) {
      throw new AppException('ERR_1001_UNAUTHORIZED', 'Không tìm thấy user trong hệ thống');
    }

    // 2. Get ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('id, status, customer_id, tenant_id')
      .eq('id', ticketId)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (ticketError || !ticket) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Ticket không tồn tại');
    }

    if (ticket.status === 'RESOLVED') {
      throw new AppException('ERR_6003_TICKET_ALREADY_RESOLVED', 'Ticket đã được xử lý trước đó');
    }

    // 3. Resolve ticket
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({
        status: 'RESOLVED',
        assigned_to: staffUser.id,
        resolution_note: dto.resolution_note ?? null
      })
      .eq('id', ticketId);

    if (updateError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi resolve ticket');
    }

    // 4. Optionally issue compensation voucher to customer
    let voucher: any = null;
    if (ticket.customer_id && (dto.discount_percent || dto.free_item_product_id)) {
      const supabaseAdmin = this.supabaseService.admin();
      const { data: voucherData } = await supabaseAdmin
        .from('customer_vouchers')
        .insert({
          customer_id: ticket.customer_id,
          source: 'CSAT_APOLOGY',
          discount_percent: dto.discount_percent ?? null,
          free_item_product_id: dto.free_item_product_id ?? null,
          expires_at: null
        })
        .select('id, source, discount_percent, free_item_product_id')
        .single();
      voucher = voucherData;
    }

    // 5. Audit log
    const supabaseAdmin = this.supabaseService.admin();
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: user.tenant_id,
      actor_user_id: staffUser.id,
      action: 'RESOLVE_SUPPORT_TICKET',
      entity_type: 'support_tickets',
      entity_id: ticketId,
      metadata: {
        resolution_note: dto.resolution_note,
        voucher_issued: !!voucher
      }
    });

    return {
      message: 'Ticket đã được xử lý',
      ...(voucher ? { voucher } : {})
    };
  }

  // ─────────────────────────────────────────────
  // POST /support/customers/merge
  // ─────────────────────────────────────────────
  async mergeCustomers(user: AuthenticatedUser, accessToken: string, dto: MergeCustomersDto) {
    if (dto.source_customer_id === dto.target_customer_id) {
      throw new AppException('ERR_6004_MERGE_SAME_CUSTOMER', 'source_customer_id và target_customer_id không được trùng nhau');
    }

    const supabase = this.supabaseService.forUser(accessToken);

    // 1. Resolve staff user id
    const { data: staffUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.sub)
      .single();

    if (!staffUser) {
      throw new AppException('ERR_1001_UNAUTHORIZED', 'Không tìm thấy user trong hệ thống');
    }

    // 2. Verify both customers exist in tenant
    const { data: sourceCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', dto.source_customer_id)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (!sourceCustomer) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Source customer không tồn tại trong tenant');
    }

    const { data: targetCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', dto.target_customer_id)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (!targetCustomer) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Target customer không tồn tại trong tenant');
    }

    // 3. Call fn_merge_customer_profiles — ERD.md mục 3.3
    // Must use admin client: fn_merge_customer_profiles is SECURITY DEFINER,
    // but we need elevated rights to call it safely under proper validation
    const supabaseAdmin = this.supabaseService.admin();
    const { error: mergeError } = await supabaseAdmin.rpc('fn_merge_customer_profiles', {
      source_id: dto.source_customer_id,
      target_id: dto.target_customer_id
    });

    if (mergeError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', `Lỗi khi merge khách hàng: ${mergeError.message}`);
    }

    // 4. Audit log
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: user.tenant_id,
      actor_user_id: staffUser.id,
      action: 'MERGE_CUSTOMER_PROFILES',
      entity_type: 'customers',
      entity_id: dto.target_customer_id,
      metadata: {
        source_customer_id: dto.source_customer_id,
        target_customer_id: dto.target_customer_id
      }
    });

    return { message: 'Hợp nhất khách hàng thành công' };
  }
}
