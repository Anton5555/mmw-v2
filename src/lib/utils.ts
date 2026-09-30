import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Entrance delay for the nth item of a list. Capped so long grids
 * don't make the last cards wait seconds to appear.
 */
export function staggerDelay(index: number, step = 40, maxSteps = 12) {
  return { animationDelay: `${Math.min(index, maxSteps) * step}ms` };
}
