import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

const SESSION_COOKIE = 'better-auth.session_token=abc.def';

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, 'https://example.test'), {
    headers: cookie ? { cookie } : undefined,
  });
}

function redirectTarget(res: Response) {
  const location = res.headers.get('location');
  return location ? new URL(location).pathname : null;
}

describe('proxy', () => {
  it.each([
    '/manifest.webmanifest',
    '/icons/icon-512.png',
    '/icons/maskable-512.png',
    '/apple-icon.png',
    '/sw.js',
    '/offline.html',
    '/.well-known/assetlinks.json',
    '/logo.png',
  ])('lets %s through without a session', async (path) => {
    const res = await proxy(request(path));
    expect(redirectTarget(res)).toBeNull();
  });

  it('redirects protected pages to sign-in without a session', async () => {
    const res = await proxy(request('/home'));
    expect(redirectTarget(res)).toBe('/sign-in');
  });

  it('lets protected pages through with a session cookie', async () => {
    const res = await proxy(request('/home', SESSION_COOKIE));
    expect(redirectTarget(res)).toBeNull();
  });
});
