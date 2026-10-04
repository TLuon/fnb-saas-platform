import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { StaffService } from './staff.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentAccessToken, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { ListStaffQueryDto } from './dto/list-staff-query.dto.js';

@Controller('staff')
@Roles('OWNER')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  listStaff(@Query() query: ListStaffQueryDto, @CurrentAccessToken() token: string) {
    return this.staffService.listStaff(token, query.branch_id);
  }

  @Post()
  createStaff(
    @Body() dto: CreateStaffDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAccessToken() token: string,
  ) {
    return this.staffService.createStaff(token, user.tenant_id, dto);
  }

  @Patch(':id')
  updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffDto, @CurrentAccessToken() token: string) {
    return this.staffService.updateStaff(token, id, dto);
  }

  @Patch(':id/deactivate')
  deactivateStaff(@Param('id') id: string, @CurrentAccessToken() token: string) {
    return this.staffService.deactivateStaff(token, id);
  }

  @Post(':id/reset-password')
  resetStaffPassword(
    @Param('id') id: string,
    @Body('password') password: string | undefined,
    @CurrentAccessToken() token: string,
  ) {
    return this.staffService.resetStaffPassword(token, id, password);
  }
}

