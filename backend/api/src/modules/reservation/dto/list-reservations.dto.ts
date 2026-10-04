import { IsOptional, IsString } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class ListReservationsDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUuidLoose()
  table_id?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsUuidLoose()
  branch_id?: string;
}
