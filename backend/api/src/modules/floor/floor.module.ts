import { Module } from '@nestjs/common';
import { FloorController } from './floor.controller.js';
import { FloorService } from './floor.service.js';
import { RealtimeModule } from '../../common/realtime/realtime.module.js';

@Module({
  imports: [RealtimeModule],
  controllers: [FloorController],
  providers: [FloorService],
})
export class FloorModule {}
