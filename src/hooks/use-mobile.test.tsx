// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIsMobile } from './use-mobile';

function stubViewport(width: number) {
  const listeners = new Set<() => void>();
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
  vi.stubGlobal('matchMedia', () => ({
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }));
  return {
    resize(next: number) {
      window.innerWidth = next;
      listeners.forEach((cb) => cb());
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useIsMobile', () => {
  it('is true below the 768px breakpoint', () => {
    stubViewport(767);
    expect(renderHook(() => useIsMobile()).result.current).toBe(true);
  });

  it('is false at and above the breakpoint', () => {
    stubViewport(768);
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });

  it('reacts to viewport changes and unsubscribes on unmount', () => {
    const viewport = stubViewport(1024);
    const { result, unmount } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => viewport.resize(500));
    expect(result.current).toBe(true);

    unmount();
    act(() => viewport.resize(1024));
    expect(result.current).toBe(true); // no longer subscribed
  });
});
