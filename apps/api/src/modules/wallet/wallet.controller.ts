import { Controller, Get, Post, Body, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { WalletService } from './wallet.service.js';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, CurrentAccessToken } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { TopupDto } from './dto/topup.dto.js';

@Controller('wallet')
@UseGuards(SupabaseAuthGuard, TenantGuard, RolesGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @Roles('CUSTOMER')
  async getWallet(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string
  ) {
    return this.walletService.getWallet(user, accessToken);
  }

  @Post('topup')
  @Roles('CUSTOMER')
  async topup(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Body() dto: TopupDto
  ) {
    return this.walletService.topup(user, accessToken, dto);
  }

  @Get('transactions')
  @Roles('CUSTOMER')
  async getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
  ) {
    return this.walletService.getTransactions(user, accessToken, page, limit);
  }

  @Get('vouchers')
  @Roles('CUSTOMER')
  async getVouchers(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string
  ) {
    return this.walletService.getVouchers(user, accessToken);
  }
}
