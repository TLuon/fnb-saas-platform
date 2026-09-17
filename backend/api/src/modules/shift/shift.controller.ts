import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ShiftService } from './shift.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentAccessToken, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { OpenShiftDto } from './dto/open-shift.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';
import { ListShiftsQueryDto } from './dto/list-shifts-query.dto.js';

@Controller()
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Roles('OWNER', 'STAFF')
  @Post('shifts/open')
  openShift(
    @Body() dto: OpenShiftDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() token: string,
  ) {
    return this.shiftService.openShift(token, user, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Post('shifts/:id/close')
  closeShift(
    @Param('id') shiftId: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() token: string,
  ) {
    return this.shiftService.closeShift(token, user, shiftId, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Get('shifts/current')
  getCurrentShift(
    @Query('branch_id') branchId: string,
    @CurrentAccessToken() token: string,
  ) {
    return this.shiftService.getCurrentShift(token, branchId);
  }

  @Roles('OWNER', 'STAFF')
  @Get('shifts')
  listShifts(
    @Query() query: ListShiftsQueryDto,
    @CurrentAccessToken() token: string,
  ) {
    return this.shiftService.listShifts(token, query);
  }
}
