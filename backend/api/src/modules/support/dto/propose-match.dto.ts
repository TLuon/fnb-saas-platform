import { IsUUID, IsNotEmpty } from 'class-validator';

/** API_CONTRACT.md mục 10 — POST /support/unmatched/:id/propose */
export class ProposeMatchDto {
  @IsUUID()
  @IsNotEmpty()
  customer_id: string;
}
