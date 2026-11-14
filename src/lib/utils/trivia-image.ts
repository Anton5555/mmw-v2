import sharp from 'sharp';
import {
  computeTriviaCropWindow,
  triviaBackdropUrl,
  type TriviaFocus,
} from './trivia-image-constants';

export {
  TRIVIA_IMAGE_STEPS,
  TRIVIA_IMAGE_STEP_COUNT,
  computeTriviaCropWindow,
  triviaBackdropUrl,
  type TriviaFocus,
  type CropWindow,
} from './trivia-image-constants';

const OUTPUT_WIDTH = 1280;

/**
 * Crop + upscale a TMDB backdrop buffer for a trivia reveal step.
 * Server-only — imports sharp.
 */
export async function renderTriviaStep(
  buffer: Buffer,
  focus: TriviaFocus,
  step: number
): Promise<Buffer> {
  const image = sharp(buffer);
  const meta = await image.metadata();
  const imageWidth = meta.width ?? 0;
  const imageHeight = meta.height ?? 0;
  const crop = computeTriviaCropWindow(
    imageWidth,
    imageHeight,
    focus,
    step
  );

  return image
    .extract(crop)
    .resize({
      width: OUTPUT_WIDTH,
      withoutEnlargement: false,
      fit: 'inside',
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

export async function fetchTriviaBackdropBuffer(
  backdropPath: string
): Promise<Buffer> {
  const response = await fetch(triviaBackdropUrl(backdropPath));
  if (!response.ok) {
    throw new Error(
      `Failed to fetch trivia backdrop (${response.status}): ${backdropPath}`
    );
  }
  return Buffer.from(await response.arrayBuffer());
}
