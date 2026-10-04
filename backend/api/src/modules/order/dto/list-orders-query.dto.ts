import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class ListOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsUuidLoose()
  branch_id?: string;

  @IsOptional()
  @IsIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsIn(['DINE_IN', 'TAKEAWAY'])
  order_type?: string;
}
