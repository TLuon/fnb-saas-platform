import { IsIn, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class PayOrderDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['VIETQR', 'WALLET', 'COFFEE_PASS'])
  payment_method: string;

  @IsOptional()
  @IsString()
  coffee_pass_subscription_id?: string;

  @IsOptional()
  @IsString()
  totp_code?: string;
}
