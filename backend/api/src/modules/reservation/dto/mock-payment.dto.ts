import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class MockPaymentDto {
  @IsString()
  @IsNotEmpty()
  raw_transfer_content: string;

  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsUuidLoose()
  tenant_id?: string;
}
