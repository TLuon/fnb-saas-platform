import { Module } from '@nestjs/common';
import { ReservationController } from './reservation.controller.js';
import { ReservationService } from './reservation.service.js';
import { RealtimeModule } from '../../common/realtime/realtime.module.js';

@Module({
  imports: [RealtimeModule],
  controllers: [ReservationController],
  providers: [ReservationService],
})
export class ReservationModule {}
