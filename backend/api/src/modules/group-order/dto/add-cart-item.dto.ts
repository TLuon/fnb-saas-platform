import { IsUUID, IsNotEmpty, IsNumber, Min, IsOptional, IsArray, IsString } from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
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
