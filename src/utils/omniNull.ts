/**
 * Omni-Null Detection Engine
 *
 * Scans every cell for: null, undefined, "", "   " (whitespace), "NA", "N/A", "NaN", "-", or "null".
 * Case-insensitive, trimmed.
 */

export const OMNI_NULL_STRINGS = [
  'na',
  'n/a',
  '#n/a',
  'nan',
  '-',
  '--',
  'null',
  'none',
  'nil',
] as const;

/**
 * Checks if a value matches the Omni-Null definition.
 */
export function isOmniNull(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'number') return isNaN(val);
  const str = String(val).trim();
  if (str === '') return true; // Matches "" and "   "
  const lower = str.toLowerCase();
  return (
    lower === 'na' ||
    lower === 'n/a' ||
    lower === '#n/a' ||
    lower === 'nan' ||
    lower === '-' ||
    lower === '--' ||
    lower === 'null' ||
    lower === 'none' ||
    lower === 'nil'
  );
}
