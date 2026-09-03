import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

/**
 * API_CONTRACT.md mục 4 — POST /staff (OWNER).
 * CỐ Ý chỉ cho phép role STAFF/SUPPORT — không cho tạo thêm OWNER qua
 * endpoint này (tránh leo thang đặc quyền qua Staff Management, ngoài
 * phạm vi API_CONTRACT.md mô tả).
 */
export class CreateStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  full_name: string;

  @IsString()
  phone: string;

  @IsIn(['STAFF', 'SUPPORT'])
  role: 'STAFF' | 'SUPPORT';

  /** Bắt buộc với STAFF (gắn 1 chi nhánh), để trống với SUPPORT (CSKH toàn tenant). */
  @IsOptional()
  @IsUuidLoose()
  branch_id?: string;
}
