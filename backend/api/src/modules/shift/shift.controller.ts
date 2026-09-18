import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ShiftService } from './shift.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentAccessToken, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { OpenShiftDto } from './dto/open-shift.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';
import { ListShiftsQueryDto } from './dto/list-shifts-query.dto.js';

@Controller()
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Roles('OWNER', 'STAFF')
  @Post('shifts/open')
  async openShift(
    @Body() dto: OpenShiftDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() token: string,
  ) {
    return this.shiftService.openShift(token, user, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Post('shifts/:id/close')
  async closeShift(
    @Param('id') shiftId: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() token: string,
  ) {
    return this.shiftService.closeShift(token, user, shiftId, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Get('shifts/current')
  async getCurrentShift(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() token: string,
    @Query('branch_id') branchId?: string,
  ) {
    let targetBranchId = user.branch_id;
    if (user.role_app === 'OWNER' && branchId) {
      targetBranchId = branchId;
    } else if (user.role_app === 'STAFF' && branchId && branchId !== user.branch_id) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Nhân viên không có quyền truy cập chi nhánh khác');
    }

    if (!targetBranchId) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Tài khoản chưa được gán chi nhánh');
    }

    return this.shiftService.getCurrentShift(token, user, targetBranchId);
  }

  @Roles('OWNER', 'STAFF')
  @Get('shifts')
  async listShifts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListShiftsQueryDto,
    @CurrentAccessToken() token: string,
  ) {
    return this.shiftService.listShifts(token, user, query);
  }
}
