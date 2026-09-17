import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

/** B1.md P2.3 — GET /public/catalog?tenant_subdomain=&branch_id= (Public catalog cho khách vãng lai). */
export class PublicCatalogQueryDto {
  @IsNotEmpty()
  @IsString()
  tenant_subdomain!: string;

  @IsOptional()
  @IsUuidLoose()
  branch_id?: string;
}
