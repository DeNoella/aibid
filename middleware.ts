import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/login', '/register', '/mfa/pending', '/mfa/approve'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes, static files, and public paths
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    publicPaths.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
