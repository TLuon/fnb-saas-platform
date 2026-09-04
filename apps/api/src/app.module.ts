import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import supabaseConfig from './config/supabase.config.js';
import redisConfig from './config/redis.config.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { FloorModule } from './modules/floor/floor.module.js';
import { MenuModule } from './modules/menu/menu.module.js';
import { StaffModule } from './modules/staff/staff.module.js';
import { CdpModule } from './modules/cdp/cdp.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [supabaseConfig, redisConfig],
    }),
    CommonModule,
    AuthModule,
    FloorModule,
    MenuModule,
    StaffModule,
    CdpModule,
  ],
})
export class AppModule {}
