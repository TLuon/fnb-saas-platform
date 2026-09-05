import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MakerCheckerGuard } from './maker-checker.guard';

@Controller('support')
export class SupportController {
  @Post('approve')
  @UseGuards(MakerCheckerGuard)
  approveTransaction(@Body() payload: any) {
    return { success: true, message: 'Transaction approved successfully' };
  }
}
