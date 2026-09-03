import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * API_CONTRACT.md mục 1: đăng ký CUSTOMER — backend resolve tenant từ
 * tenant_subdomain, tạo customers + wallets rỗng.
 *
 * BẢO MẬT (SETUP.md mục 10 điểm 5): DTO này CỐ Ý không có field `role`.
 * Dù client cố tình gửi thêm `"role":"OWNER"` trong body, ValidationPipe
 * với { whitelist: true } (main.ts) sẽ tự động loại bỏ field lạ không
 * khai báo trong DTO trước khi tới service — tài khoản tạo ra luôn chỉ
 * là CUSTOMER.
 */
export class RegisterDto {
  @IsString()
  tenant_subdomain: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  full_name?: string;
}
