'use client';

import { useEffect } from 'react';

// Registers the offline-fallback service worker (public/sw.js) in production.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Not fatal: the app works without it, only the offline page is lost.
    });
  }, []);

  return null;
}
