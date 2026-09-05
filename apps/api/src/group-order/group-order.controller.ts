import { Controller, Get, Post, Delete, Param, Body, Headers } from '@nestjs/common';
import { GroupOrderService } from './group-order.service';

@Controller('group-order')
export class GroupOrderController {
  constructor(private readonly groupOrderService: GroupOrderService) {}

  @Get(':tableId/cart')
  getCart(@Param('tableId') tableId: string) {
    return this.groupOrderService.getCart(tableId);
  }

  @Post(':tableId/items')
  addItem(
    @Param('tableId') tableId: string,
    @Body() item: any,
    @Headers('x-user-id') userId: string
  ) {
    return this.groupOrderService.addItem(tableId, item, userId || 'anonymous');
  }

  @Delete(':tableId/items/:itemId')
  removeItem(
    @Param('tableId') tableId: string,
    @Param('itemId') itemId: string,
    @Headers('x-user-id') userId: string
  ) {
    return this.groupOrderService.removeItem(tableId, itemId, userId || 'anonymous');
  }
}
