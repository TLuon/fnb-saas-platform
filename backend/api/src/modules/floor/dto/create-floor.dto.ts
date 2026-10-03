import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';
import { IsInt, IsOptional, IsString } from 'class-validator';

/** API_CONTRACT.md mục 2 — POST /floors (OWNER). */
export class CreateFloorDto {
  @IsUuidLoose()
  branch_id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  floor_level?: number;

  @IsOptional()
  @IsString()
  background_svg?: string;
}
