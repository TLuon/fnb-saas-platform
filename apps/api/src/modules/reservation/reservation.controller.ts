import { Body, Controller, Delete, Param, Post, Req } from '@nestjs/common';
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

  @Post('webhook/mock-payment')
  @Public()
  async mockPaymentWebhook(@Body() dto: MockPaymentDto) {
    return this.reservationService.processMockPayment(dto);
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
