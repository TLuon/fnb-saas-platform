import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { FloorService } from './floor.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentAccessToken } from '../../common/decorators/current-user.decorator.js';
import { CreateFloorDto } from './dto/create-floor.dto.js';
import { ListFloorsQueryDto } from './dto/list-floors-query.dto.js';
import { CreateTableDto } from './dto/create-table.dto.js';
import { UpdateTableDto } from './dto/update-table.dto.js';
import { UpdateTableStatusDto } from './dto/update-table-status.dto.js';

@Controller()
export class FloorController {
  constructor(private readonly floorService: FloorService) {}

  @Roles('OWNER', 'STAFF', 'CUSTOMER')
  @Get('floors')
  listFloors(@Query() query: ListFloorsQueryDto, @CurrentAccessToken() token: string) {
    return this.floorService.listFloors(token, query.branch_id);
  }

  @Roles('OWNER')
  @Post('floors')
  createFloor(@Body() dto: CreateFloorDto, @CurrentAccessToken() token: string) {
    return this.floorService.createFloor(token, dto);
  }

  @Roles('OWNER', 'STAFF', 'CUSTOMER')
  @Get('floors/:id/tables')
  getFloorTables(@Param('id') floorId: string, @CurrentAccessToken() token: string) {
    return this.floorService.getFloorTables(token, floorId);
  }

  @Roles('OWNER')
  @Post('tables')
  createTable(@Body() dto: CreateTableDto, @CurrentAccessToken() token: string) {
    return this.floorService.createTable(token, dto);
  }

  @Roles('OWNER')
  @Patch('tables/:id')
  updateTable(
    @Param('id') tableId: string,
    @Body() dto: UpdateTableDto,
    @CurrentAccessToken() token: string,
  ) {
    return this.floorService.updateTable(token, tableId, dto);
  }

  @Roles('STAFF')
  @Patch('tables/:id/status')
  updateTableStatus(
    @Param('id') tableId: string,
    @Body() dto: UpdateTableStatusDto,
    @CurrentAccessToken() token: string,
  ) {
    return this.floorService.updateTableStatus(token, tableId, dto);
  }
}
