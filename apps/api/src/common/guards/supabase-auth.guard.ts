import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { AppException } from '../exceptions/app.exception.js';
import { AuthenticatedRequest, AuthenticatedUser, RoleApp } from '../types/auth.types.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

interface SupabaseJwtPayload extends JWTPayload {
  role_app?: RoleApp;
  tenant_id?: string | null;
  branch_id?: string | null;
  email?: string;
}

/**
 * Guard xác thực JWT — CODING_CONVENTION.md mục 1.3:
 * "@UseGuards(SupabaseAuthGuard, TenantGuard, RolesGuard) trên mọi
 * controller trừ route đánh dấu @Public()".
 *
 * Verify chữ ký thật qua JWKS endpoint của Supabase (project này dùng
 * ES256, khóa bất đối xứng xoay vòng theo `kid` — KHÔNG thể verify bằng
 * secret cố định). JWKS được cache tự động bởi thư viện `jose`
 * (createRemoteJWKSet), không gọi lại network mỗi request.
 *
 * Sau khi verify thành công, gắn `request.user` (role_app, tenant_id,
 * branch_id, sub) và `request.accessToken` (JWT gốc) để tầng service
 * dùng SupabaseService.forUser(accessToken) — đảm bảo RLS áp dụng đúng
 * theo RLS_POLICIES.md mục 5.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    const supabaseUrl = this.config.get<string>('supabase.url') ?? '';
    this.issuer = this.config.get<string>('supabase.jwtIssuer') ?? `${supabaseUrl}/auth/v1`;
    this.jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new AppException('ERR_1001_UNAUTHORIZED', 'Thiếu JWT trong header Authorization');
    }

    let payload: SupabaseJwtPayload;
    try {
      const result = await jwtVerify(token, this.jwks, { issuer: this.issuer });
      payload = result.payload as SupabaseJwtPayload;
    } catch {
      throw new AppException('ERR_1001_UNAUTHORIZED', 'JWT không hợp lệ hoặc đã hết hạn');
    }

    if (!payload.role_app || !payload.sub) {
      // Tài khoản chưa có role_app: user chưa được gắn vào users/customers
      // (vd. auth user tạo trực tiếp trên Dashboard nhưng chưa INSERT vào
      // bảng users tương ứng) — custom_access_token_hook trả role_app NULL.
      throw new AppException(
        'ERR_1001_UNAUTHORIZED',
        'Tài khoản chưa được gán vai trò trong hệ thống',
      );
    }

    const user: AuthenticatedUser = {
      sub: payload.sub,
      role_app: payload.role_app,
      tenant_id: payload.tenant_id ?? '',
      branch_id: payload.branch_id ?? null,
      email: payload.email,
    };

    request.user = user;
    request.accessToken = token;
    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    const header = request.headers?.['authorization'] ?? request.headers?.['Authorization'];
    if (!header || typeof header !== 'string') return null;
    const [scheme, token] = header.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }
}
