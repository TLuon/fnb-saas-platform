import { IsUUID, IsNotEmpty } from 'class-validator';

/** API_CONTRACT.md mục 10 — POST /support/customers/merge */
export class MergeCustomersDto {
  @IsUUID()
  @IsNotEmpty()
  source_customer_id: string;

  @IsUUID()
  @IsNotEmpty()
  target_customer_id: string;
}
