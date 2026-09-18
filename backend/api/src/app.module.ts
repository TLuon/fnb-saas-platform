import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import supabaseConfig from './config/supabase.config.js';
import redisConfig from './config/redis.config.js';
import { CommonModule } from './common/common.module.js';
import { RealtimeModule } from './common/realtime/realtime.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { FloorModule } from './modules/floor/floor.module.js';
import { MenuModule } from './modules/menu/menu.module.js';
import { StaffModule } from './modules/staff/staff.module.js';
import { CdpModule } from './modules/cdp/cdp.module.js';
import { ReservationModule } from './modules/reservation/reservation.module.js';
import { OrderModule } from './modules/order/order.module.js';
import { GroupOrderModule } from './modules/group-order/group-order.module.js';
import { WalletModule } from './modules/wallet/wallet.module.js';
import { CoffeePassModule } from './modules/coffee-pass/coffee-pass.module.js';
import { SupportModule } from './modules/support/support.module.js';
import { ShiftModule } from './modules/shift/shift.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [supabaseConfig, redisConfig],
    }),
    CommonModule,
    RealtimeModule,
    AuthModule,
    FloorModule,
    MenuModule,
    StaffModule,
    CdpModule,
    ReservationModule,
    OrderModule,
    GroupOrderModule,
    WalletModule,
    CoffeePassModule,
    SupportModule,
    ShiftModule,
    InventoryModule,
  ],
})
export class AppModule {}
