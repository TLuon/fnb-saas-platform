import { IsOptional, IsString } from 'class-validator';

export class ListIngredientsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
