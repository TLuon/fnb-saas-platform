import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

/** API_CONTRACT.md mục 9 — POST /cdp/customers/:id/vouchers (OWNER, SUPPORT). */
export class CreateVoucherDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000000)
  discount_percent?: number;

  @IsOptional()
  @IsUuidLoose()
  free_item_product_id?: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
