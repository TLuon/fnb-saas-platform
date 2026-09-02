import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';


/** API_CONTRACT.md mục 2 — GET /floors?branch_id=. */
export class ListFloorsQueryDto {
  @IsUuidLoose()
  branch_id: string;
}
