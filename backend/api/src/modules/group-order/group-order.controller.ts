import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { GroupOrderService } from './group-order.service.js';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, CurrentAccessToken } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { JoinGroupOrderDto } from './dto/join-group-order.dto.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';

@Controller('group-order')
@UseGuards(SupabaseAuthGuard, TenantGuard, RolesGuard)
export class GroupOrderController {
  constructor(private readonly groupOrderService: GroupOrderService) {}

  @Post('join')
  @Roles('CUSTOMER')
  async joinSession(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Body() dto: JoinGroupOrderDto
  ) {
    return this.groupOrderService.joinSession(user, accessToken, dto);
  }

  @Get(':tableId/cart')
  @Roles('CUSTOMER')
  async getCart(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('tableId') tableId: string
  ) {
    return this.groupOrderService.getCart(user, accessToken, tableId);
  }

  @Post(':tableId/cart/items')
  @Roles('CUSTOMER')
  async addCartItem(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('tableId') tableId: string,
    @Body() dto: AddCartItemDto
  ) {
    return this.groupOrderService.addCartItem(user, accessToken, tableId, dto);
  }

  @Post(':tableId/confirm')
  @Roles('CUSTOMER', 'STAFF')
  async confirmGroupOrder(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('tableId') tableId: string
  ) {
    return this.groupOrderService.confirmGroupOrder(user, accessToken, tableId);
  }
}
