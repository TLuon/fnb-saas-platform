import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

/** API_CONTRACT.md mục 10 — POST /support/tickets/:id/resolve */
export class ResolveTicketDto {
  @IsOptional()
  @IsString()
  resolution_note?: string;

  /**
   * Nếu cần phát voucher bồi thường kèm theo khi resolve ticket,
   * truyền thêm discount_percent hoặc free_item_product_id
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000000)
  discount_percent?: number;

  @IsOptional()
  @IsUuidLoose()
  free_item_product_id?: string;
}
