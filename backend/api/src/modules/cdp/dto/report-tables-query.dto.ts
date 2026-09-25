import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

/** Query DTO for GET /reports/tables?branch_id=&status= */
export class ReportTablesQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === 'all' || value === '' ? undefined : value))
  @IsUuidLoose()
  branch_id?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
