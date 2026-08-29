import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasRole } from '@fnb/utils';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('jwt')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Kiểm tra quyền CUSTOMER
  if (!hasRole(token, 'CUSTOMER')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!login|register|api|_next/static|_next/image|favicon.ico).*)',
  ],
};
