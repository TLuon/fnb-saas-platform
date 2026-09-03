import { Module } from '@nestjs/common';
import { GroupOrderController } from './group-order.controller.js';
import { GroupOrderService } from './group-order.service.js';
import { OrderModule } from '../order/order.module.js';

@Module({
  imports: [OrderModule],
  controllers: [GroupOrderController],
  providers: [GroupOrderService],
})
export class GroupOrderModule {}
