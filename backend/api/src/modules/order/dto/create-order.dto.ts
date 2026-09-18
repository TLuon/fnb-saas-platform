import { IsOptional, IsString } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class CreateOrderDto {
  @IsUuidLoose()
  @IsOptional()
  table_id?: string;

  @IsOptional()
  @IsString()
  reservation_code?: string;

  @IsOptional()
  @IsString()
  order_type?: string;
}
