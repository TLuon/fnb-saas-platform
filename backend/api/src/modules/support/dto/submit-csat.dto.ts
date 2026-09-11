import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

/** API_CONTRACT.md mục 10 — POST /support/csat */
export class SubmitCsatDto {
  @IsUuidLoose()
  @IsNotEmpty()
  order_id: string;

  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  complaint_note?: string;
}
