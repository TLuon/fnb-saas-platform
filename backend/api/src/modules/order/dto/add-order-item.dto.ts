import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class AddOrderItemDto {
  @IsUuidLoose()
  @IsNotEmpty()
  product_id: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  modifiers?: any;
}
