import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from './lib/supabase/middleware';
import { isInvalidSessionError } from './features/security/utils/isInvalidSessionError';

const publicPaths = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/register',
  '/verification',
  '/auth/callback',
]);

const guestOnlyPaths = new Set(['/login', '/signup', '/register']);
const publicCreatorProfilePath = /^\/profile\/[^/]+$/;

function copyCookies(source: NextResponse, target: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}

function redirectWithCookies(url: URL, response: NextResponse): NextResponse {
  return copyCookies(response, NextResponse.redirect(url));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    (publicPaths.has(pathname) || publicCreatorProfilePath.test(pathname)) &&
    !guestOnlyPaths.has(pathname)
  ) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });
  const supabase = createSupabaseMiddlewareClient(request, response);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  let verifiedUser = user;

  if (error && !isInvalidSessionError(error)) {
    console.error(
      'Unable to verify the Supabase session in proxy:',
      error.message,
    );
    return copyCookies(
      response,
      new NextResponse('Unable to verify your session. Please try again.', {
        status: 503,
      }),
    );
  }

  if (error) {
    const { error: signOutError } = await supabase.auth.signOut({
      scope: 'local',
    });
    verifiedUser = null;
    if (signOutError && signOutError.name !== 'AuthSessionMissingError') {
      console.error(
        'Unable to clear the invalid Supabase session in proxy:',
        signOutError.message,
      );
    }
  }

  if (!verifiedUser) {
    if (guestOnlyPaths.has(pathname)) {
      return response;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set(
      'next',
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return redirectWithCookies(loginUrl, response);
  }

  if (guestOnlyPaths.has(pathname)) {
    const feedUrl = request.nextUrl.clone();
    feedUrl.pathname = '/feed';
    feedUrl.search = '';
    return redirectWithCookies(feedUrl, response);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|wasm|map|woff2?|ttf|eot)$).*)',
  ],
};
