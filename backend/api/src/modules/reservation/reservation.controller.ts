import { Body, Controller, Delete, Headers, Param, Post, Query } from '@nestjs/common';
import { ReservationService } from './reservation.service.js';
import { LockTableDto } from './dto/lock-table.dto.js';
import { MockPaymentDto } from './dto/mock-payment.dto.js';
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
        'Thiếu tenantId (cần truyền qua route param, query tenant_id, body tenant_id, hoặc header x-tenant-id)'
      );
    }
    const providedSecret = secretHeader || secretQuery;
    return this.reservationService.processMockPayment(tenantId, dto, providedSecret);
  }

  @Delete(':code')
  @Roles('CUSTOMER')
  async cancelReservation(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('code') code: string,
  ) {
    return this.reservationService.cancelReservation(user, accessToken, code);
  }
}
