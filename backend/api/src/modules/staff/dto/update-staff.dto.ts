import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';
import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * API_CONTRACT.md mục 4 — PATCH /staff/:id (OWNER).
 * "không được sửa auth_user_id" — DTO này cố ý không có field đó, kết
 * hợp ValidationPipe({ whitelist: true }) tự loại field lạ nếu client
 * cố gửi thêm.
 */
export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUuidLoose()
  branch_id?: string;

  @IsOptional()
  @IsIn(['STAFF', 'SUPPORT'])
  role?: 'STAFF' | 'SUPPORT';
}
