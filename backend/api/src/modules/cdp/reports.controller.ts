import { Controller, Get, Query } from '@nestjs/common';
import { CdpService } from './cdp.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentAccessToken } from '../../common/decorators/current-user.decorator.js';
import { DashboardQueryDto } from './dto/dashboard-query.dto.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly cdpService: CdpService) {}

  @Roles('OWNER')
  @Get('dashboard')
  getDashboard(@Query() query: DashboardQueryDto, @CurrentAccessToken() token: string) {
    return this.cdpService.getDashboard(token, query.branch_id);
  }
}
