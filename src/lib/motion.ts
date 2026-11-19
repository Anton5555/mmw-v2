// Motion values for motion/react, mirroring the CSS tokens in globals.css.

/** Strong ease-out for entering/exiting UI. Same curve as `--ease-out`. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Stagger step for list/grid entrances, capped so long lists don't trail. */
export const staggerDelay = (index: number, stepS = 0.04, maxSteps = 10) =>
  Math.min(index, maxSteps) * stepS;
