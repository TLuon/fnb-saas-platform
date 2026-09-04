import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';


/** API_CONTRACT.md mục 4 — GET /staff?branch_id=. */
export class ListStaffQueryDto {
  @IsUuidLoose()
  branch_id: string;
}
