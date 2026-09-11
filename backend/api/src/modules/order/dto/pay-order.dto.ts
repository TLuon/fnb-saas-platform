import { IsIn, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class PayOrderDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['VIETQR', 'WALLET', 'COFFEE_PASS'])
  payment_method: string;

  @IsOptional()
  @IsUuidLoose()
  coffee_pass_subscription_id?: string;

  @IsOptional()
  @IsString()
  totp_code?: string;
}
