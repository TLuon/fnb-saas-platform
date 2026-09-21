import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class ListTransactionsQueryDto {
  @IsOptional()
  @IsUuidLoose()
  ingredient_id?: string;

  @IsOptional()
  @IsUuidLoose()
  branch_id?: string;

  @IsOptional()
  @IsIn(['IMPORT', 'EXPORT', 'ADJUSTMENT', 'ORDER_CONSUMPTION'])
  type?: 'IMPORT' | 'EXPORT' | 'ADJUSTMENT' | 'ORDER_CONSUMPTION';

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
}
