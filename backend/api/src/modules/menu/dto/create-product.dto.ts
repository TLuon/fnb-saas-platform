import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';
import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** API_CONTRACT.md mục 3 — POST /products (OWNER). */
export class CreateProductDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsUuidLoose()
  category_id: string;

  /** vd. [{ "name": "Mức đường", "options": ["100%", "50%", "0%"] }] — cấu trúc tự do, FE tự định nghĩa. */
  @IsOptional()
  @IsArray()
  default_modifiers?: unknown[];
}
