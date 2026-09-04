import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ReservationService } from './reservation.service.js';
import { LockTableDto } from './dto/lock-table.dto.js';
import { MockPaymentDto } from './dto/mock-payment.dto.js';
import { CurrentUser, CurrentAccessToken } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';

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
   * POST /reservations/webhook/mock-payment/:tenantId
   *
   * @Public — không yêu cầu JWT (đây là webhook từ bank mock).
   *
   * `:tenantId` buộc bank/mock caller phải chỉ định tenant mà payment thuộc về.
   * Server validate tenant tồn tại trước khi insert, không tin mù vào giá trị này
   * mà chỉ dùng để gắn context — giả mạo tenantId sẽ bị chặn bởi
   * validation tenant tồn tại (bước đầu tiên trong processMockPayment).
   *
   * Thay đổi này đảm bảo mọi payment_transactions (kể cả UNMATCHED) luôn có
   * tenant_id ≠ null, cho phép Support của đúng tenant query được qua listUnmatched.
   */
  @Post('webhook/mock-payment/:tenantId')
  @Public()
  async mockPaymentWebhook(
    @Param('tenantId') tenantId: string,
    @Body() dto: MockPaymentDto,
  ) {
    return this.reservationService.processMockPayment(tenantId, dto);
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
