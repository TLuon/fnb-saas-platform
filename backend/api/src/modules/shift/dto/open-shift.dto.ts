import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class OpenShiftDto {
  @IsOptional()
  @IsUuidLoose()
  branch_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  starting_cash?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initial_cash?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
