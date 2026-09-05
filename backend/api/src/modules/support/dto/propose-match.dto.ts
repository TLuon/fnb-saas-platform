import { IsNotEmpty } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

/** API_CONTRACT.md mục 10 — POST /support/unmatched/:id/propose */
export class ProposeMatchDto {
  @IsUuidLoose()
  @IsNotEmpty()
  customer_id: string;
}
