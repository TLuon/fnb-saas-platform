import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

/** API_CONTRACT.md mục 10 — POST /support/csat */
export class SubmitCsatDto {
  @IsUUID()
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
