import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class CreateOrderDto {
  @IsUuidLoose()
  @IsNotEmpty()
  table_id: string;

  @IsOptional()
  @IsString()
  reservation_code?: string;
}
