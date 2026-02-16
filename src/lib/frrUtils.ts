/**
 * Normalizes FRR (Fire Resistance Rating) values to standard ratings
 * Standard FRR ratings: 30, 45, 60, 90, 120, 180, 240 minutes
 */

const STANDARD_FRR_RATINGS = [30, 45, 60, 90, 120, 180, 240];

/**
 * Normalizes a single FRR value to the nearest standard rating
 * @param value - The FRR value to normalize
 * @returns The nearest standard FRR rating
 */
export function normalizeFRRValue(value: number): number {
  if (value <= 0) return 30;
  if (value >= 240) return 240;

  let closest = STANDARD_FRR_RATINGS[0];
  let minDiff = Math.abs(value - closest);

  for (const rating of STANDARD_FRR_RATINGS) {
    const diff = Math.abs(value - rating);
    if (diff < minDiff) {
      minDiff = diff;
      closest = rating;
    }
  }

  return closest;
}

/**
 * Parses and normalizes an FRR format string (e.g., "38/-/-", "84/120/60")
 * Returns the normalized format with standard ratings
 * @param frrFormat - The FRR format string to normalize
 * @returns The normalized FRR format string
 */
export function normalizeFRRFormat(frrFormat: string): string {
  if (!frrFormat || frrFormat === '-') return '-';

  const parts = frrFormat.split('/').map(part => part.trim());

  const normalizedParts = parts.map(part => {
    if (part === '-' || part === '') return '-';

    const value = parseInt(part, 10);
    if (isNaN(value)) return '-';

    return normalizeFRRValue(value).toString();
  });

  return normalizedParts.join('/-/');
}

/**
 * Extracts and normalizes the primary FRR value from a format string
 * @param frrFormat - The FRR format string (e.g., "38/-/-")
 * @param frrMinutes - The raw FRR minutes value
 * @returns The normalized primary FRR value
 */
export function getPrimaryFRR(frrFormat: string | null, frrMinutes: number | null): number | null {
  // Try to extract from format first
  if (frrFormat) {
    const parts = frrFormat.split('/');
    const firstValue = parseInt(parts[0], 10);
    if (!isNaN(firstValue)) {
      return normalizeFRRValue(firstValue);
    }
  }

  // Fallback to frrMinutes
  if (frrMinutes !== null && !isNaN(frrMinutes)) {
    return normalizeFRRValue(frrMinutes);
  }

  return null;
}

/**
 * Formats FRR for display, showing only the normalized first value if format has dashes
 * @param frrFormat - The FRR format string
 * @param frrMinutes - The FRR minutes value
 * @returns Formatted FRR string for display
 */
export function displayFRR(frrFormat: string | null, frrMinutes: number | null): string {
  // If no data, return dash
  if (!frrFormat && !frrMinutes) return '-';

  // If we have a format like "38/-/-" or "84/-/-"
  if (frrFormat && frrFormat.includes('/-/')) {
    const parts = frrFormat.split('/');
    const firstValue = parseInt(parts[0], 10);

    if (!isNaN(firstValue)) {
      const normalized = normalizeFRRValue(firstValue);

      // Check if other parts are meaningful
      const hasOtherValues = parts.slice(1).some(p => {
        const val = parseInt(p.trim(), 10);
        return !isNaN(val) && val > 0;
      });

      if (hasOtherValues) {
        // Normalize all parts and return full format
        return normalizeFRRFormat(frrFormat);
      } else {
        // Just return the single normalized value with dashes
        return `${normalized}/-/-`;
      }
    }
  }

  // If we have a simple format or just minutes
  if (frrFormat) {
    return normalizeFRRFormat(frrFormat);
  }

  if (frrMinutes !== null && !isNaN(frrMinutes)) {
    return normalizeFRRValue(frrMinutes).toString();
  }

  return '-';
}
