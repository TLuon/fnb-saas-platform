import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class AddOrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  product_id: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  modifiers?: any;
}
