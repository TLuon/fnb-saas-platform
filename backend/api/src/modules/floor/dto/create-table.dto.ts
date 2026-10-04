import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const TABLE_SHAPES = ['RECTANGLE', 'CIRCLE', 'SQUARE'] as const;

/** API_CONTRACT.md mục 2 — POST /tables (OWNER). */
export class CreateTableDto {
  @IsUuidLoose()
  floor_id: string;

  @IsOptional()
  @IsString()
  table_code?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsNumber()
  pos_x: number;

  @IsNumber()
  pos_y: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsString()
  shape?: string;

  @IsOptional()
  @IsNumber()
  rotation?: number;
}
