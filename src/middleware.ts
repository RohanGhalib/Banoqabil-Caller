import { NextResponse } from 'next/server';

export function middleware() {
  // Let Next.js client-side layouts handle role-based auth routing for testing convenience
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/caller/:path*'],
};
