import { NextRequest, NextResponse } from 'next/server';

const PORTAL_PREFIXES = ['/dashboard', '/rca', '/evidence', '/reports', '/settings'];
const API_PROTECTED   = ['/api/cases', '/api/orgs'];

function hasSession(req: NextRequest): boolean {
  return !!(
    req.cookies.get('authjs.session-token') ??
    req.cookies.get('__Secure-authjs.session-token')
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPortal      = PORTAL_PREFIXES.some(p => pathname.startsWith(p));
  const isApiGuarded  = API_PROTECTED.some(p => pathname.startsWith(p));
  const authenticated = hasSession(req);

  if ((isPortal || isApiGuarded) && !authenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && authenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
};
