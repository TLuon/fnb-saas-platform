import { Module } from '@nestjs/common';
import { CoffeePassController } from './coffee-pass.controller.js';
import { CoffeePassService } from './coffee-pass.service.js';
import { WalletModule } from '../wallet/wallet.module.js';

@Module({
  imports: [WalletModule],
  controllers: [CoffeePassController],
  providers: [CoffeePassService],
  exports: [CoffeePassService]
})
export class CoffeePassModule {}
