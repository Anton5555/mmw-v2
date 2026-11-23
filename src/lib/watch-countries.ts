/**
 * Countries a member can pick for "Dónde verla". All of them are TMDB
 * watch-provider regions. Client-safe (no server imports).
 */
export const WATCH_COUNTRY_CODES = [
  'AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'DO', 'EC', 'GT', 'HN', 'MX', 'NI',
  'PA', 'PE', 'PY', 'SV', 'UY', 'VE',
  'ES', 'PT', 'FR', 'IT', 'DE', 'GB', 'IE', 'NL', 'BE', 'CH', 'AT',
  'SE', 'NO', 'DK', 'FI', 'PL',
  'US', 'CA', 'AU', 'NZ', 'JP', 'KR', 'IL',
] as const;

export type WatchCountryCode = (typeof WATCH_COUNTRY_CODES)[number];

/** Used when a member has not picked a country. */
export const DEFAULT_WATCH_COUNTRY: WatchCountryCode = 'AR';

export function isWatchCountry(value: unknown): value is WatchCountryCode {
  return (
    typeof value === 'string' &&
    (WATCH_COUNTRY_CODES as readonly string[]).includes(value)
  );
}

/** "AR" → "Argentina", in Spanish. Falls back to the code. */
export function watchCountryName(code: string) {
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Picker options, sorted by Spanish name. */
export function watchCountryOptions() {
  return WATCH_COUNTRY_CODES.map((code) => ({
    code,
    name: watchCountryName(code),
  })).toSorted((a, b) => a.name.localeCompare(b.name, 'es'));
}
