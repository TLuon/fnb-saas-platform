import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CdpService } from './cdp.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentAccessToken, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { ListCustomersBySegmentQueryDto } from './dto/list-customers-query.dto.js';
import { CreateVoucherDto } from './dto/create-voucher.dto.js';

@Controller('cdp')
@Roles('OWNER', 'SUPPORT')
export class CdpController {
  constructor(private readonly cdpService: CdpService) {}

  @Get('customers')
  listCustomers(@Query() query: ListCustomersBySegmentQueryDto, @CurrentAccessToken() token: string) {
    return this.cdpService.listCustomersBySegment(token, query.segment);
  }

  @Get('customers/:id/360')
  getCustomer360(@Param('id') id: string, @CurrentAccessToken() token: string) {
    return this.cdpService.getCustomer360(token, id);
  }

  @Post('customers/:id/vouchers')
  createVoucher(
    @Param('id') id: string,
    @Body() dto: CreateVoucherDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cdpService.createVoucher(user, id, dto);
  }
}
