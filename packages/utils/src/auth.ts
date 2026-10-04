import { jwtDecode } from 'jwt-decode';

export interface JwtPayload {
  role_app?: string;
  tenant_id?: string;
  branch_id?: string;
  sub?: string;
  exp?: number;
}

export function parseToken(token: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch (e) {
    return null;
  }
}

export function hasRole(token: string, requiredRole: string): boolean {
  const payload = parseToken(token);
  if (!payload || !payload.role_app) return false;
  
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    return false;
  }

  return payload.role_app === requiredRole;
}
