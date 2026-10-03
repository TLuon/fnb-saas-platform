import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { FloorService } from './floor.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentAccessToken, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { CreateFloorDto } from './dto/create-floor.dto.js';
import { UpdateFloorDto } from './dto/update-floor.dto.js';
import { ListFloorsQueryDto } from './dto/list-floors-query.dto.js';
import { CreateTableDto } from './dto/create-table.dto.js';
import { UpdateTableDto } from './dto/update-table.dto.js';
import { UpdateTableStatusDto } from './dto/update-table-status.dto.js';

@Controller()
export class FloorController {
  constructor(private readonly floorService: FloorService) {}

  @Public()
  @Get('branches')
  listBranches(@CurrentAccessToken() token?: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.floorService.listBranches(token || '', user?.tenant_id || '11111111-1111-1111-1111-111111111111');
  }

  @Public()
  @Get('floors')
  listFloors(@Query() query: ListFloorsQueryDto, @CurrentAccessToken() token?: string) {
    return this.floorService.listFloors(token || '', query.branch_id);
  }

  @Roles('OWNER', 'STAFF')
  @Post('floors')
  createFloor(@Body() dto: CreateFloorDto, @CurrentAccessToken() token: string) {
    return this.floorService.createFloor(token, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Patch('floors/:id')
  updateFloor(
    @Param('id') floorId: string,
    @Body() dto: UpdateFloorDto,
    @CurrentAccessToken() token: string,
  ) {
    return this.floorService.updateFloor(token, floorId, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Delete('floors/:id')
  deleteFloor(@Param('id') floorId: string, @CurrentAccessToken() token: string) {
    return this.floorService.deleteFloor(token, floorId);
  }

  @Roles('OWNER', 'STAFF')
  @Post('floors/:id/copy-from/:sourceFloorId')
  copyFloorLayout(
    @Param('id') targetFloorId: string,
    @Param('sourceFloorId') sourceFloorId: string,
    @CurrentAccessToken() token: string,
  ) {
    return this.floorService.cloneFloorLayout(token, targetFloorId, sourceFloorId);
  }

  @Public()
  @Get('floors/:id/tables')
  getFloorTables(@Param('id') floorId: string, @CurrentAccessToken() token?: string) {
    return this.floorService.getFloorTables(token || '', floorId);
  }

  @Roles('OWNER', 'STAFF')
  @Post('tables')
  createTable(@Body() dto: CreateTableDto, @CurrentAccessToken() token: string) {
    return this.floorService.createTable(token, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Patch('tables/:id')
  updateTable(
    @Param('id') tableId: string,
    @Body() dto: UpdateTableDto,
    @CurrentAccessToken() token: string,
  ) {
    return this.floorService.updateTable(token, tableId, dto);
  }

  @Roles('OWNER', 'STAFF')
  @Delete('tables/:id')
  deleteTable(@Param('id') tableId: string, @CurrentAccessToken() token: string) {
    return this.floorService.deleteTable(token, tableId);
  }

  @Roles('STAFF', 'OWNER')
  @Patch('tables/:id/status')
  updateTableStatus(
    @Param('id') tableId: string,
    @Body() dto: UpdateTableStatusDto,
    @CurrentAccessToken() token: string,
  ) {
    return this.floorService.updateTableStatus(token, tableId, dto);
  }
}

