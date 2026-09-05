import { IsNotEmpty, IsNumber, Min, IsOptional, IsArray, IsString } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class AddCartItemDto {
  @IsUuidLoose()
  @IsNotEmpty()
  product_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modifiers?: string[];
}
