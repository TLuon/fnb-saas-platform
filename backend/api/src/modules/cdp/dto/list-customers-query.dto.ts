import { IsIn, IsOptional } from 'class-validator';

const SEGMENTS = ['VIP', 'LOYAL', 'CHURN_RISK', 'NEW', 'ALL'] as const;

/** API_CONTRACT.md mục 9 — GET /cdp/customers?segment=. */
export class ListCustomersBySegmentQueryDto {
  @IsOptional()
  @IsIn(SEGMENTS)
  segment?: (typeof SEGMENTS)[number];
}
