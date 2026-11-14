/** Fraction of the shorter side covered by each reveal step (1-based). */
export const TRIVIA_IMAGE_STEPS = [0.2, 0.35, 0.55, 0.8, 1.0] as const;

export const TRIVIA_IMAGE_STEP_COUNT = TRIVIA_IMAGE_STEPS.length;

export type TriviaFocus = {
  focusX: number;
  focusY: number;
};

export type CropWindow = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Pure crop math for a reveal step. Step is 1-based (1 = tightest crop).
 * Focus is a 0–1 point in the source image; the window is clamped to bounds.
 */
export function computeTriviaCropWindow(
  imageWidth: number,
  imageHeight: number,
  focus: TriviaFocus,
  step: number
): CropWindow {
  if (imageWidth <= 0 || imageHeight <= 0) {
    throw new Error('Image dimensions must be positive');
  }
  if (step < 1 || step > TRIVIA_IMAGE_STEP_COUNT) {
    throw new Error(
      `Trivia image step must be 1–${TRIVIA_IMAGE_STEP_COUNT}, got ${step}`
    );
  }

  const fraction = TRIVIA_IMAGE_STEPS[step - 1]!;
  const shortSide = Math.min(imageWidth, imageHeight);
  let width = Math.max(1, Math.round(shortSide * fraction));
  let height = Math.max(1, Math.round(shortSide * fraction));

  width = Math.min(width, imageWidth);
  height = Math.min(height, imageHeight);

  if (step === TRIVIA_IMAGE_STEP_COUNT) {
    return { left: 0, top: 0, width: imageWidth, height: imageHeight };
  }

  const focusX = clamp01(focus.focusX);
  const focusY = clamp01(focus.focusY);
  const centerX = focusX * imageWidth;
  const centerY = focusY * imageHeight;

  let left = Math.round(centerX - width / 2);
  let top = Math.round(centerY - height / 2);

  left = Math.min(Math.max(0, left), imageWidth - width);
  top = Math.min(Math.max(0, top), imageHeight - height);

  return { left, top, width, height };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

export function triviaBackdropUrl(backdropPath: string): string {
  const path = backdropPath.startsWith('/')
    ? backdropPath
    : `/${backdropPath}`;
  return `https://image.tmdb.org/t/p/w1280${path}`;
}
