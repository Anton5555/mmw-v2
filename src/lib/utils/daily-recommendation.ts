/**
 * Utility functions for calculating daily recommendations
 */

/**
 * Convert a date to a numeric seed for deterministic selection
 */
export function getDateSeed(date: Date): number {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  // Simple hash: sum of char codes
  return dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

/**
 * Determine the content type for a given day based on the seed
 * Uses modulo-based rotation: 0 = movie, 1 = list, 2 = participant
 */
export function getDailyContentType(seed: number): 'movie' | 'list' | 'participant' {
  const typeIndex = seed % 3;
  switch (typeIndex) {
    case 0:
      return 'movie';
    case 1:
      return 'list';
    case 2:
      return 'participant';
    default:
      return 'movie'; // fallback
  }
}

/**
 * Deterministically select an item from an array using a seed
 */
export function selectFromArray<T>(array: T[], seed: number): T {
  if (array.length === 0) {
    throw new Error('Cannot select from empty array');
  }
  const index = seed % array.length;
  return array[index];
}

/**
 * Normalize a date to UTC midnight for consistent storage
 */
export function normalizeDateToUTC(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}
