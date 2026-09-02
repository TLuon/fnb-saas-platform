import { SetMetadata } from '@nestjs/common';
import { RoleApp } from '../types/auth.types.js';

export const ROLES_KEY = 'roles';

/**
 * Khai báo role được phép gọi route — đối chiếu cột "Role" trong
 * API_CONTRACT.md. Dùng cùng RolesGuard.
 *
 * Ví dụ: @Roles('OWNER') @Post('floors') createFloor() { ... }
 */
export const Roles = (...roles: RoleApp[]) => SetMetadata(ROLES_KEY, roles);
