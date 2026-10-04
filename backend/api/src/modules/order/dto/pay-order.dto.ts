import { IsIn, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class PayOrderDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['VIETQR', 'WALLET', 'COFFEE_PASS', 'CASH'])
  payment_method: string;

  @IsOptional()
  @IsUuidLoose()
  coffee_pass_subscription_id?: string;

  @IsOptional()
  @IsString()
  totp_code?: string;

  @IsOptional()
  @IsUuidLoose()
  voucher_id?: string;

  @IsOptional()
  @IsString()
  @IsIn(['IN_PROGRESS', 'COMPLETED'])
  status?: string;
}
