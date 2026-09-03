import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';


/** API_CONTRACT.md mục 9 — GET /reports/dashboard?branch_id=. */
export class DashboardQueryDto {
  @IsUuidLoose()
  branch_id: string;
}
