/**
 * Parses expiration time from string format and converts to milliseconds
 * @param exp - Expiration string (e.g., "1H", "1D", "1M", "1Y")
 * @returns Date object with the expiration time
 */
export function parseExpiration(exp: string): Date {
  const now = new Date();
  const value = parseInt(exp.slice(0, -1)); // Remove the last character (H, D, M, Y)
  const unit = exp.slice(-1).toUpperCase(); // Get the unit

  switch (unit) {
    case 'H': // Hours
      now.setHours(now.getHours() + value);
      break;
    case 'D': // Days
      now.setDate(now.getDate() + value);
      break;
    case 'M': // Months
      now.setMonth(now.getMonth() + value);
      break;
    case 'Y': // Years
      now.setFullYear(now.getFullYear() + value);
      break;
    default:
      throw new Error(
        `Invalid expiration unit: ${unit}. Must be one of: H, D, M, Y`,
      );
  }

  return now;
}

/**
 * Validates if the expiration format is one of the allowed formats
 * @param exp - Expiration string to validate
 * @returns boolean indicating if the format is valid
 */
export function isValidExpirationFormat(exp: string): boolean {
  const validFormats = /^(\d+)H|(\d+)D|(\d+)M|(\d+)Y$/i;
  return validFormats.test(exp);
}
