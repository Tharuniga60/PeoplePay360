import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

const { auth } = NextAuth(authConfig);
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes requiring authentication
const PROTECTED_PATHS = [
  '/employees',
  '/payruns',
  '/payslips',
  '/leaves',
  '/api/employees',
  '/api/contracts',
  '/api/attendance',
  '/api/leaves',
  '/api/payruns',
  '/api/payslips',
];

// Routes requiring payroll-level access
const PAYROLL_ONLY_PATHS = ['/payruns', '/api/payruns'];

const PAYROLL_ROLES = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const session = req.auth;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !session?.user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session?.user) {
    const userRole = session.user.role ?? '';
    const isPayrollPath = PAYROLL_ONLY_PATHS.some((p) => pathname.startsWith(p));
    if (isPayrollPath && !PAYROLL_ROLES.includes(userRole)) {
      return NextResponse.redirect(new URL('/?error=unauthorized', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
