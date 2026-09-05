import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OrderService } from './order.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { AddOrderItemDto } from './dto/add-order-item.dto.js';
import { UpdateOrderItemDto } from './dto/update-order-item.dto.js';
import { UpdateKitchenStatusDto } from './dto/update-kitchen-status.dto.js';
import { PayOrderDto } from './dto/pay-order.dto.js';
import { CurrentUser, CurrentAccessToken } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @Roles('STAFF')
  async createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(user, accessToken, dto);
  }

  @Post(':id/items')
  @Roles('STAFF', 'CUSTOMER')
  async addOrderItem(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('id') orderId: string,
    @Body() dto: AddOrderItemDto,
  ) {
    return this.orderService.addOrderItem(user, accessToken, orderId, dto);
  }

  @Patch(':id/items/:itemId')
  @Roles('STAFF', 'CUSTOMER')
  async updateOrderItem(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ) {
    return this.orderService.updateOrderItem(user, accessToken, orderId, itemId, dto);
  }

  @Post(':id/submit-kitchen')
  @Roles('STAFF')
  async submitKitchen(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('id') orderId: string,
  ) {
    return this.orderService.submitKitchen(user, accessToken, orderId);
  }

  @Patch(':id/items/:itemId/kitchen-status')
  @Roles('STAFF')
  async updateKitchenStatus(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateKitchenStatusDto,
  ) {
    return this.orderService.updateKitchenStatus(user, accessToken, orderId, itemId, dto);
  }

  @Post(':id/pay')
  @Roles('STAFF', 'CUSTOMER')
  async payOrder(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('id') orderId: string,
    @Body() dto: PayOrderDto,
  ) {
    return this.orderService.payOrder(user, accessToken, orderId, dto);
  }

  @Get(':id')
  @Roles('STAFF', 'CUSTOMER', 'OWNER')
  async getOrder(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() accessToken: string,
    @Param('id') orderId: string,
  ) {
    return this.orderService.getOrder(user, accessToken, orderId);
  }
}
