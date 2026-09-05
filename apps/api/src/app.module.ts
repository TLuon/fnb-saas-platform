import { Module } from '@nestjs/common';
import { GroupOrderService } from './group-order/group-order.service';
import { GroupOrderController } from './group-order/group-order.controller';
import { KitchenGateway } from './kitchen/kitchen.gateway';
import { PaymentController } from './payment/payment.controller';
import { SupportController } from './support/support.controller';

@Module({
  imports: [],
  controllers: [GroupOrderController, PaymentController, SupportController],
  providers: [GroupOrderService, KitchenGateway],
})
export class AppModule {}
