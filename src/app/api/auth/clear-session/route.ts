import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

const AUTH_COOKIE_PREFIXES = ['better-auth.', '__Secure-better-auth.'];

// Server components can't delete cookies, so pages that find a stale session
// cookie redirect here. Otherwise the proxy keeps treating the user as signed in.
export async function GET(request: NextRequest) {
  const session = await auth.api
    .getSession({ headers: request.headers })
    .catch(() => null);

  // Never sign out a valid session from a plain GET link
  if (session?.user) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  const response = NextResponse.redirect(new URL('/sign-in', request.url));

  for (const { name } of request.cookies.getAll()) {
    if (AUTH_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))) {
      response.cookies.set(name, '', {
        path: '/',
        maxAge: 0,
        secure: name.startsWith('__Secure-'),
      });
    }
  }

  return response;
}
