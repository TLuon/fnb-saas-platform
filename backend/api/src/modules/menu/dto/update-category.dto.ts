import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto.js';

/** API_CONTRACT.md mục 3 — PATCH /categories/:id (OWNER). */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
