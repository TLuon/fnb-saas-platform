import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Cho phép đăng nhập bằng email HOẶC phone — service tự kiểm tra ít
 * nhất 1 trong 2 field có mặt (xem AuthService.login), throw
 * ERR_9001_VALIDATION_FAILED nếu thiếu cả hai.
 */
export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6)
  password: string;
}
