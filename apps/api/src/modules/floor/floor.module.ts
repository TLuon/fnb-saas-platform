import { Module } from '@nestjs/common';
import { FloorController } from './floor.controller.js';
import { FloorService } from './floor.service.js';

@Module({
  controllers: [FloorController],
  providers: [FloorService],
})
export class FloorModule {}
