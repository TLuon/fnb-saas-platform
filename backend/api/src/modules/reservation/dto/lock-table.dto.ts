import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class LockTableDto {
  @IsUuidLoose()
  @IsNotEmpty()
  table_id: string;

  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsOptional()
  @IsString()
  customer_phone?: string;

  @IsOptional()
  @IsString()
  booking_date?: string;

  @IsOptional()
  @IsString()
  booking_time?: string;

  @IsOptional()
  @IsNumber()
  duration_hours?: number;

  @IsOptional()
  @IsNumber()
  guest_count?: number;

  @IsOptional()
  @IsString()
  created_by_role?: string;

  @IsOptional()
  @IsString()
  payment_method_deposit?: string;
}
