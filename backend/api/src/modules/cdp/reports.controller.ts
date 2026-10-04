import { Controller, Get, Query } from '@nestjs/common';
import { CdpService } from './cdp.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentAccessToken, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { DashboardQueryDto } from './dto/dashboard-query.dto.js';
import { ReportTablesQueryDto } from './dto/report-tables-query.dto.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly cdpService: CdpService) {}

  @Roles('OWNER')
  @Get('dashboard')
  getDashboard(
    @Query() query: DashboardQueryDto,
    @CurrentAccessToken() token: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cdpService.getDashboard(token, user, query.branch_id, query.period);
  }

  @Roles('OWNER')
  @Get('orders')
  getRevenueOrders(
    @Query() query: DashboardQueryDto,
    @CurrentAccessToken() token: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cdpService.getRevenueOrders(token, user, query.branch_id, query.period);
  }

  @Roles('OWNER')
  @Get('tables')
  getOccupiedTables(
    @Query() query: ReportTablesQueryDto,
    @CurrentAccessToken() token: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cdpService.getOccupiedTables(token, user, query.branch_id, query.status);
  }
}
