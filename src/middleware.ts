import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Let Next.js client-side layouts handle role-based auth routing for testing convenience
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/caller/:path*'],
};
