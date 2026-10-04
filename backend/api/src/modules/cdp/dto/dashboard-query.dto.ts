import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

/** API_CONTRACT.md mục 9 — GET /reports/dashboard?branch_id=&period=. */
export class DashboardQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === 'all' || value === '' ? undefined : value))
  @IsUuidLoose()
  branch_id?: string;

  @IsOptional()
  @IsString()
  period?: string;
}
