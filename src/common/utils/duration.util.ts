/**
 * Safely parses any duration input (timespan string, number, quoted string)
 * into a guaranteed integer number of seconds.
 *
 * Examples:
 * - '1d', '"1d"', '“1d”', '24h' -> 86400
 * - '3600', 3600, '3600s' -> 3600
 * - '60m' -> 3600
 * - undefined, null, invalid -> 86400 (safe fallback)
 */
export function parseDurationToSeconds(
  val: unknown,
  fallbackSeconds = 86400,
): number {
  if (typeof val === 'number' && !isNaN(val) && val > 0) {
    return Math.floor(val);
  }
  if (!val || typeof val !== 'string') {
    return fallbackSeconds;
  }

  // Clean away any quotes, smart quotes, slashes, whitespace
  const clean = val
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim()
    .toLowerCase();

  // If pure digits, treat as seconds
  if (/^\d+$/.test(clean)) {
    const num = parseInt(clean, 10);
    return num > 0 ? num : fallbackSeconds;
  }

  const match = clean.match(/^(\d+)([smhdwy])$/);
  if (match) {
    const count = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return count;
      case 'm':
        return count * 60;
      case 'h':
        return count * 3600;
      case 'd':
        return count * 86400;
      case 'w':
        return count * 86400 * 7;
      case 'y':
        return count * 86400 * 365;
    }
  }

  return fallbackSeconds;
}
