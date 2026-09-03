import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CoffeePassService } from './coffee-pass.service.js';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, CurrentAccessToken } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { SubscribeDto } from './dto/subscribe.dto.js';
import { RedeemDto } from './dto/redeem.dto.js';

@Controller('coffee-pass')
@UseGuards(SupabaseAuthGuard, TenantGuard, RolesGuard)
export class CoffeePassController {
  constructor(private readonly coffeePassService: CoffeePassService) {}

  @Get('plans')
  @Roles('CUSTOMER')
  async getPlans(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string
  ) {
    return this.coffeePassService.getPlans(user, accessToken);
  }

  @Post('subscribe')
  @Roles('CUSTOMER')
  async subscribe(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Body() dto: SubscribeDto
  ) {
    return this.coffeePassService.subscribe(user, accessToken, dto);
  }

  @Get(':id/current-code')
  @Roles('CUSTOMER')
  async getCurrentCode(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('id') subscriptionId: string
  ) {
    return this.coffeePassService.getCurrentCode(user, accessToken, subscriptionId);
  }

  @Post(':id/redeem')
  @Roles('STAFF', 'OWNER') // As per API_CONTRACT.md, STAFF scans the code
  async redeem(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('id') subscriptionId: string,
    @Body() dto: RedeemDto
  ) {
    return this.coffeePassService.redeem(user, accessToken, subscriptionId, dto);
  }
}
