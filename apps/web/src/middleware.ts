import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Vercel-only migration guard.
 *
 * The app now self-hosts at https://ac-studio.calyzr-ai.my.id (Docker +
 * Cloudflare tunnel). The old Vercel deployment is kept alive ONLY to inform
 * visitors who still open the legacy URL. This middleware runs exclusively on
 * Vercel (`process.env.VERCEL`), so the self-hosted Docker build is unaffected.
 */
export function middleware(req: NextRequest) {
  if (process.env.VERCEL && req.nextUrl.pathname !== '/migrated') {
    const url = req.nextUrl.clone();
    url.pathname = '/migrated';
    url.search = '';
    return NextResponse.redirect(url, 307);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|logo|migrated).*)'],
};
