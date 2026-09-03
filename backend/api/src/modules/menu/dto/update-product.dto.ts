import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProductDto } from './create-product.dto.js';

/** API_CONTRACT.md mục 3 — PATCH /products/:id (OWNER): giá, tên, default_modifiers, is_active. */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
