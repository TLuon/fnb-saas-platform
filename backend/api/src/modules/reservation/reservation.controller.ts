import { Body, Controller, Delete, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ReservationService } from './reservation.service.js';
import { LockTableDto } from './dto/lock-table.dto.js';
import { MockPaymentDto } from './dto/mock-payment.dto.js';
import { CheckInDto } from './dto/check-in.dto.js';
import { ListReservationsDto } from './dto/list-reservations.dto.js';
import { CurrentUser, CurrentAccessToken } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { AppException } from '../../common/exceptions/app.exception.js';

@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post('lock')
  @Roles('CUSTOMER')
  async lockTable(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Body() dto: LockTableDto,
  ) {
    return this.reservationService.lockTable(user, accessToken, dto);
  }

  @Post(':code/generate-qr')
  @Roles('CUSTOMER')
  async generateQr(
    @CurrentUser() user: AuthenticatedUser,
    @Param('code') code: string,
  ) {
    return this.reservationService.generateQr(user, code);
  }

  /**
   * POST /reservations/webhook/mock-payment
   * POST /reservations/webhook/mock-payment/:tenantId
   *
   * @Public — không yêu cầu JWT (đây là webhook từ bank mock).
   * Hỗ trợ cả 2 route để hoàn toàn tương thích với API_CONTRACT.md mục 5
   * và cho phép caller truyền tenantId qua path param, query (?tenant_id=),
   * header (x-tenant-id) hoặc body.
   */
  @Post(['webhook/mock-payment', 'webhook/mock-payment/:tenantId'])
  @Public()
  async mockPaymentWebhook(
    @Body() dto: MockPaymentDto,
    @Param('tenantId') tenantIdParam?: string,
    @Query('tenant_id') tenantIdQuery?: string,
    @Headers('x-tenant-id') tenantIdHeader?: string,
    @Headers('x-webhook-secret') secretHeader?: string,
    @Query('secret') secretQuery?: string,
  ) {
    const tenantId = tenantIdParam || tenantIdQuery || tenantIdHeader || dto.tenant_id;
    if (!tenantId) {
      throw new AppException(
        'ERR_1003_TENANT_MISMATCH',
        'Thiếu tenantId (cần truyền qua route param, query tenant_id, body tenant_id, hoặc header x-tenant-id)',
      );
    }
    const providedSecret = secretHeader || secretQuery;
    return this.reservationService.processMockPayment(tenantId, dto, providedSecret);
  }

  /**
   * Check-in cho Staff:
   * POST /reservations/:code/check-in
   * POST /reservations/check-in
   */
  @Post([':code/check-in', 'check-in'])
  @Roles('STAFF', 'OWNER')
  async checkIn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('code') code?: string,
    @Body() dto?: CheckInDto,
  ) {
    return this.reservationService.checkIn(user, code, dto);
  }

  /**
   * Xác nhận đã nhận tiền cọc (STAFF / OWNER)
   * POST /reservations/:code/confirm-deposit
   */
  @Post(':code/confirm-deposit')
  @Roles('STAFF', 'OWNER')
  async confirmDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('code') code: string,
  ) {
    return this.reservationService.confirmDeposit(user, code);
  }

  /**
   * Lấy danh sách đặt bàn (STAFF / OWNER)
   * GET /reservations
   */
  @Get()
  @Roles('STAFF', 'OWNER')
  async listReservations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListReservationsDto,
  ) {
    console.log('listReservations CALLED', { user_tenant: user.tenant_id, query });
    return this.reservationService.listReservations(user, query);
  }

  /**
   * Lấy danh sách đặt bàn của khách hàng hiện tại
   * GET /reservations/my
   */
  @Get('my')
  @Roles('CUSTOMER')
  async getMyReservations(@CurrentUser() user: AuthenticatedUser) {
    return this.reservationService.getMyReservations(user);
  }

  /**
   * Lấy chi tiết đặt bàn theo mã code
   * GET /reservations/:code
   */
  @Get(':code')
  @Roles('STAFF', 'OWNER', 'CUSTOMER')
  async getReservation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('code') code: string,
  ) {
    return this.reservationService.getReservation(user, code);
  }

  @Delete(':code')
  @Roles('CUSTOMER', 'STAFF', 'OWNER')
  async cancelReservation(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('code') code: string,
  ) {
    return this.reservationService.cancelReservation(user, accessToken, code);
  }
}
