import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { SupportService } from './support.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, CurrentAccessToken } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { SubmitCsatDto } from './dto/submit-csat.dto.js';
import { ProposeMatchDto } from './dto/propose-match.dto.js';
import { ResolveTicketDto } from './dto/resolve-ticket.dto.js';
import { MergeCustomersDto } from './dto/merge-customers.dto.js';

// Guards (SupabaseAuthGuard, TenantGuard, RolesGuard) đã được đăng ký global trong CommonModule
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * POST /support/csat
   * API_CONTRACT.md mục 10 — CUSTOMER gửi đánh giá CSAT sau thanh toán
   */
  @Post('csat')
  @Roles('CUSTOMER')
  async submitCsat(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Body() dto: SubmitCsatDto
  ) {
    return this.supportService.submitCsat(user, accessToken, dto);
  }

  /**
   * GET /support/unmatched
   * API_CONTRACT.md mục 10 — SUPPORT xem hàng đợi giao dịch lỗi
   */
  @Get('unmatched')
  @Roles('SUPPORT', 'OWNER')
  async listUnmatched(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
  ) {
    return this.supportService.listUnmatched(user, accessToken, page, limit);
  }

  /**
   * GET /support/unmatched/:id/suggest
   * API_CONTRACT.md mục 10 — Gợi ý khách khớp bằng fn_suggest_customer_match
   */
  @Get('unmatched/:id/suggest')
  @Roles('SUPPORT', 'OWNER')
  async suggestMatch(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('id') unmatchedId: string
  ) {
    return this.supportService.suggestMatch(user, accessToken, unmatchedId);
  }

  /**
   * POST /support/unmatched/:id/propose
   * API_CONTRACT.md mục 10 — Maker đề xuất khớp khách
   */
  @Post('unmatched/:id/propose')
  @Roles('SUPPORT')
  async proposeMatch(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('id') unmatchedId: string,
    @Body() dto: ProposeMatchDto
  ) {
    return this.supportService.proposeMatch(user, accessToken, unmatchedId, dto);
  }

  /**
   * POST /support/unmatched/:id/approve
   * API_CONTRACT.md mục 10 — Checker phê duyệt đề xuất. Cấm self-approval.
   */
  @Post('unmatched/:id/approve')
  @Roles('SUPPORT', 'OWNER')
  async approveMatch(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('id') unmatchedId: string
  ) {
    return this.supportService.approveMatch(user, accessToken, unmatchedId);
  }

  /**
   * GET /support/tickets
   * API_CONTRACT.md mục 10 — Danh sách ticket CSAT (URGENT first)
   */
  @Get('tickets')
  @Roles('SUPPORT', 'OWNER')
  async listTickets(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
  ) {
    return this.supportService.listTickets(user, accessToken, page, limit);
  }

  /**
   * POST /support/tickets/:id/resolve
   * API_CONTRACT.md mục 10 — SUPPORT xử lý ticket, tuỳ chọn kèm voucher
   */
  @Post('tickets/:id/resolve')
  @Roles('SUPPORT', 'OWNER')
  async resolveTicket(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('id') ticketId: string,
    @Body() dto: ResolveTicketDto
  ) {
    return this.supportService.resolveTicket(user, accessToken, ticketId, dto);
  }

  /**
   * POST /support/customers/merge
   * API_CONTRACT.md mục 10 — Hợp nhất hồ sơ khách trùng bằng fn_merge_customer_profiles
   */
  @Post('customers/merge')
  @Roles('SUPPORT', 'OWNER')
  async mergeCustomers(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Body() dto: MergeCustomersDto
  ) {
    return this.supportService.mergeCustomers(user, accessToken, dto);
  }
}
