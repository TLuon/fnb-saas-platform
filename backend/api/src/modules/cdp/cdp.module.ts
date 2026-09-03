import { Module } from '@nestjs/common';
import { CdpController } from './cdp.controller.js';
import { ReportsController } from './reports.controller.js';
import { CdpService } from './cdp.service.js';

@Module({
  controllers: [CdpController, ReportsController],
  providers: [CdpService],
})
export class CdpModule {}
