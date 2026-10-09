/**
 * Math Safety Utility: cleanFloat
 *
 * Strips all characters except digits, decimals, and negative signs,
 * converting the result to a Float (returning 0 if invalid).
 *
 * CRITICAL RULE: You must ONLY apply cleanFloat() inside the AggregationEngine
 * right before running SUM or AVERAGE. You must NEVER mutate the values inside
 * window.activeDataset. The raw data must retain its original formatting (e.g., "$1,500")
 * for the HTML table view and exports.
 */
export function cleanFloat(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  const str = String(value).trim();
  if (str === '') return 0;

  // Keep only digits, decimal point, and leading/negative sign
  const cleaned = str.replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
    return 0;
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
