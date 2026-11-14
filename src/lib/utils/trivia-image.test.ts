import { describe, expect, it } from 'vitest';
import {
  TRIVIA_IMAGE_STEP_COUNT,
  computeTriviaCropWindow,
  triviaBackdropUrl,
} from './trivia-image-constants';

describe('computeTriviaCropWindow', () => {
  it('returns a tight centered crop for step 1', () => {
    const crop = computeTriviaCropWindow(1000, 1000, { focusX: 0.5, focusY: 0.5 }, 1);
    expect(crop.width).toBe(200);
    expect(crop.height).toBe(200);
    expect(crop.left).toBe(400);
    expect(crop.top).toBe(400);
  });

  it('widens on later steps and returns the full frame on the last step', () => {
    const mid = computeTriviaCropWindow(1920, 1080, { focusX: 0.5, focusY: 0.5 }, 3);
    expect(mid.width).toBe(Math.round(1080 * 0.55));
    expect(mid.height).toBe(Math.round(1080 * 0.55));

    const full = computeTriviaCropWindow(1920, 1080, { focusX: 0.1, focusY: 0.1 }, TRIVIA_IMAGE_STEP_COUNT);
    expect(full).toEqual({ left: 0, top: 0, width: 1920, height: 1080 });
  });

  it('clamps the window inside the image when focus is near an edge', () => {
    const crop = computeTriviaCropWindow(1000, 800, { focusX: 0, focusY: 0 }, 2);
    expect(crop.left).toBe(0);
    expect(crop.top).toBe(0);
    expect(crop.left + crop.width).toBeLessThanOrEqual(1000);
    expect(crop.top + crop.height).toBeLessThanOrEqual(800);
  });

  it('rejects invalid steps and dimensions', () => {
    expect(() =>
      computeTriviaCropWindow(0, 100, { focusX: 0.5, focusY: 0.5 }, 1)
    ).toThrow(/positive/);
    expect(() =>
      computeTriviaCropWindow(100, 100, { focusX: 0.5, focusY: 0.5 }, 0)
    ).toThrow(/step/);
    expect(() =>
      computeTriviaCropWindow(100, 100, { focusX: 0.5, focusY: 0.5 }, 99)
    ).toThrow(/step/);
  });
});

describe('triviaBackdropUrl', () => {
  it('builds a w1280 TMDB url', () => {
    expect(triviaBackdropUrl('/abc.jpg')).toBe(
      'https://image.tmdb.org/t/p/w1280/abc.jpg'
    );
    expect(triviaBackdropUrl('abc.jpg')).toBe(
      'https://image.tmdb.org/t/p/w1280/abc.jpg'
    );
  });
});
