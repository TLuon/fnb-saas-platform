import { Module } from '@nestjs/common';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { CoffeePassModule } from '../coffee-pass/coffee-pass.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';

@Module({
  imports: [WalletModule, CoffeePassModule, InventoryModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService]
})
export class OrderModule {}
