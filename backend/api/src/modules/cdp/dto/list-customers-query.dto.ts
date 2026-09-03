import { IsIn } from 'class-validator';

const SEGMENTS = ['VIP', 'LOYAL', 'CHURN_RISK', 'NEW'] as const;

/** API_CONTRACT.md mục 9 — GET /cdp/customers?segment=. */
export class ListCustomersBySegmentQueryDto {
  @IsIn(SEGMENTS)
  segment: (typeof SEGMENTS)[number];
}
