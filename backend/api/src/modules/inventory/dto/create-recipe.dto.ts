import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class CreateRecipeDto {
  @IsNotEmpty()
  @IsUuidLoose()
  product_id!: string;

  @IsNotEmpty()
  @IsUuidLoose()
  ingredient_id!: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  amount!: number;
}
