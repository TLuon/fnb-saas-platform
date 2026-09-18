import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsUuidLoose()
  ingredient_id!: string;

  @IsOptional()
  @IsUuidLoose()
  branch_id?: string;

  @IsNotEmpty()
  @IsIn(['IMPORT', 'EXPORT', 'ADJUSTMENT'])
  type!: 'IMPORT' | 'EXPORT' | 'ADJUSTMENT';

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
