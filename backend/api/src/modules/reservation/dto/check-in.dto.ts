import { IsOptional, IsString } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class CheckInDto {
  @IsOptional()
  @IsString()
  reservation_code?: string;

  @IsOptional()
  @IsUuidLoose()
  table_id?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
