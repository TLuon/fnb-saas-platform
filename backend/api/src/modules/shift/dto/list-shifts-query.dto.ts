import { IsIn, IsOptional } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class ListShiftsQueryDto {
  @IsOptional()
  @IsUuidLoose()
  branch_id?: string;

  @IsOptional()
  @IsIn(['OPEN', 'CLOSED'])
  status?: 'OPEN' | 'CLOSED';
}
