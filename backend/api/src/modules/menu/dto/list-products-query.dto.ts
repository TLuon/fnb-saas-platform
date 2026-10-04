import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';
import { IsOptional } from 'class-validator';

/** API_CONTRACT.md mục 3 — GET /products?category_id= (category_id tùy chọn). */
export class ListProductsQueryDto {
  @IsOptional()
  @IsUuidLoose()
  category_id?: string;
}
