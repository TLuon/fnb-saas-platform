import { IsOptional, IsString } from 'class-validator';

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
  discount_percent?: number;

  @IsOptional()
  @IsString()
  free_item_product_id?: string;
}
