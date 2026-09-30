import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Add routes that don't require authentication
const publicRoutes = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/api/auth/verify-email',
];

// Add routes that are always public (like images, etc)
const staticRoutes = ['/logo.png'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static routes
  if (staticRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if the route is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Optimistic check only: the cookie's presence is not proof of a valid
  // session. Pages and actions must still validate with auth.api.getSession.
  const session = getSessionCookie(request);

  // Handle root path
  if (pathname === '/') {
    return session
      ? NextResponse.redirect(new URL('/home', request.url))
      : NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // If it's a public route, allow access without session check
  if (isPublicRoute) {
    // Optional: Redirect authenticated users trying to access auth pages back to home
    if (session) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return NextResponse.next();
  }

  // If the user is not authenticated and trying to access a protected route
  if (!session) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
