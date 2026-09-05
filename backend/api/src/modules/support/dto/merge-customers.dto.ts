import { IsNotEmpty } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

/** API_CONTRACT.md mục 10 — POST /support/customers/merge */
export class MergeCustomersDto {
  @IsUuidLoose()
  @IsNotEmpty()
  source_customer_id: string;

  @IsUuidLoose()
  @IsNotEmpty()
  target_customer_id: string;
}
