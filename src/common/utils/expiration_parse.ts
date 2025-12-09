/**
 * Parses expiration time from string format and converts between hours and days
 * @param exp - Expiration string (e.g., "7d", "24h", "7", "24")
 * @param unit - Target unit for conversion ('hours' or 'days'), defaults to 'hours'
 * @returns Expiration time in the specified unit
 */
export function parseExpiration(
  exp: string,
  unit: 'hours' | 'days' = 'hours',
): number {
  const value = parseInt(exp);

  if (exp.includes('d')) {
    return unit === 'days' ? value : value * 24;
  }

  if (exp.includes('h')) {
    return unit === 'hours' ? value : value / 24;
  }

  // Default fallback when no unit is specified
  return unit === 'hours' ? 24 : 7;
}
