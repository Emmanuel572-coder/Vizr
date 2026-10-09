/**
 * Smart Currency & Formatting Engine
 *
 * Implements:
 * 1. Deep Currency Detection: Scans both column header and the first 5 row values for
 *    currency symbols ("NGN", "₦", "$", "USD", "£", "€") or keywords ("Price", "Budget", "Cost").
 * 2. Global Column Currency Registry: Stores detected currency symbol globally per column.
 * 3. Math Safety: Strips all currency symbols, commas, and spaces to convert to pure JavaScript Float.
 *    Treats blanks/nulls as 0 to eliminate NaN errors.
 * 4. Global formatNumber utility: Uses Intl.NumberFormat to render with commas and 2 decimals when
 *    currency is detected, or standard commas when no currency is detected.
 */

// Global registry mapping column name -> detected currency symbol
const globalColumnCurrencyMap = new Map<string, string>();

/**
 * Currency Symbol Mapping:
 * Maps common currency abbreviations / symbols to canonical display symbols
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  '₦': '₦',
  NAIRA: '₦',
  USD: '$',
  '$': '$',
  DOLLAR: '$',
  DOLLARS: '$',
  GBP: '£',
  '£': '£',
  POUND: '£',
  POUNDS: '£',
  EUR: '€',
  '€': '€',
  EURO: '€',
  EUROS: '€',
};

/**
 * 1. Deep Currency Detection Function
 * Scans BOTH the column header and a sample of the first 5 row values for
 * currency symbols ("NGN", "₦", "$", "USD", "£", "€") or keywords ("Price", "Budget", "Cost", etc.).
 */
export function detectCurrency(columnName: string, columnData: any[] = []): string | null {
  if (!columnName) return null;

  const headerRaw = String(columnName).trim();
  const headerLower = headerRaw.toLowerCase();

  // A. Scan column header for explicit symbols or codes
  if (headerRaw.includes('₦') || headerLower.includes('ngn') || headerLower.includes('naira')) {
    setColumnCurrency(columnName, '₦');
    return '₦';
  }
  if (headerRaw.includes('$') || /\busd\b/i.test(headerLower) || headerLower.includes('dollar')) {
    setColumnCurrency(columnName, '$');
    return '$';
  }
  if (headerRaw.includes('£') || /\bgbp\b/i.test(headerLower) || headerLower.includes('pound')) {
    setColumnCurrency(columnName, '£');
    return '£';
  }
  if (headerRaw.includes('€') || /\beur\b/i.test(headerLower) || headerLower.includes('euro')) {
    setColumnCurrency(columnName, '€');
    return '€';
  }

  // B. Scan a sample of the first 5 row values for currency symbols
  const sample = (columnData || []).slice(0, 5);
  for (const item of sample) {
    if (item === null || item === undefined || item === '') continue;
    const str = String(item).trim();

    if (str.includes('₦') || /\bngn\b/i.test(str)) {
      setColumnCurrency(columnName, '₦');
      return '₦';
    }
    if (str.includes('$') || /\busd\b/i.test(str)) {
      setColumnCurrency(columnName, '$');
      return '$';
    }
    if (str.includes('£') || /\bgbp\b/i.test(str)) {
      setColumnCurrency(columnName, '£');
      return '£';
    }
    if (str.includes('€') || /\beur\b/i.test(str)) {
      setColumnCurrency(columnName, '€');
      return '€';
    }
  }

  // C. Scan column header for financial keywords ("Price", "Budget", "Cost", "Revenue", "Salary", "Fee", "Spend")
  const hasFinancialKeyword =
    headerLower.includes('price') ||
    headerLower.includes('budget') ||
    headerLower.includes('cost') ||
    headerLower.includes('revenue') ||
    headerLower.includes('salary') ||
    headerLower.includes('fee') ||
    headerLower.includes('spend');

  if (hasFinancialKeyword) {
    // If the header or any sample value suggests Nigerian Naira context, use ₦, otherwise default to $
    const sampleHasNgn = sample.some((s) => String(s).toLowerCase().includes('ngn'));
    const detected = sampleHasNgn ? '₦' : '$';
    setColumnCurrency(columnName, detected);
    return detected;
  }

  return null;
}

/**
 * 2. Store detected currency symbol globally for that specific column
 */
export function setColumnCurrency(columnName: string, currencySymbol: string): void {
  if (!columnName || !currencySymbol) return;
  globalColumnCurrencyMap.set(columnName, currencySymbol);
  // Also store lowercase and normalized variants for resilient lookup
  globalColumnCurrencyMap.set(columnName.trim().toLowerCase(), currencySymbol);
}

/**
 * Retrieve globally stored currency symbol for a column
 */
export function getColumnCurrency(columnName: string): string | null {
  if (!columnName) return null;
  return (
    globalColumnCurrencyMap.get(columnName) ||
    globalColumnCurrencyMap.get(columnName.trim().toLowerCase()) ||
    null
  );
}

/**
 * Batch detect and store currencies for all columns in a dataset
 */
export function registerDatasetCurrencies(
  headers: string[],
  rows: Record<string, any>[]
): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((h) => {
    const colData = rows.map((r) => r[h]);
    const detected = detectCurrency(h, colData);
    if (detected) {
      result[h] = detected;
      setColumnCurrency(h, detected);
    }
  });
  return result;
}

/**
 * 3. Math Safety (Crucial):
 * Before the AggregationEngine attempts to SUM or AVERAGE any numeric column,
 * it must execute a regex strip to remove all currency symbols, commas, and spaces,
 * converting the value to a pure JavaScript Float. If a cell is blank or null,
 * treat it as 0 to prevent NaN crashes.
 */
export function stripCurrencyAndParseFloat(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  const str = String(val).trim();
  if (
    str === '' ||
    str === '-' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === 'undefined'
  ) {
    return 0;
  }

  // Execute regex strip to remove all currency symbols (₦, $, £, €, ¥, NGN, USD, GBP, EUR), commas, spaces, percentages
  const stripped = str
    .replace(/[₦$£€¥,\s%]/g, '')
    .replace(/\b(ngn|usd|gbp|eur|naira|dollars?|euros?|pounds?)\b/gi, '');

  const num = parseFloat(stripped);
  return isNaN(num) ? 0 : num;
}

/**
 * C. Global Formatting Utility:
 * 1. Uses Intl.NumberFormat.
 * 2. If a currency symbol was detected for the column, formats the output to include it
 *    with commas and 2 decimals (e.g., ₦9,500,000.00). If no currency is detected,
 *    uses standard commas (e.g., 9,500,000).
 */
export function formatNumber(
  value: number | string | null | undefined,
  currencySymbol?: string | null
): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  // Convert to pure float if needed
  const num = typeof value === 'number' ? value : stripCurrencyAndParseFloat(value);
  if (isNaN(num)) {
    return String(value);
  }

  // If a currency symbol was detected for the column, format with commas and 2 decimals
  if (currencySymbol && currencySymbol.trim() !== '') {
    const symbol = currencySymbol.trim();
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
    return `${symbol}${formatted}`;
  }

  // If no currency is detected, use standard commas
  const hasDecimals = !Number.isInteger(num);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Compact Number Abbreviation:
 * Uses Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
 * to convert large numbers (e.g., 5.1M or 12.5K) while retaining the auto-detected currency symbol.
 */
export function formatCompactNumber(
  value: number | string | null | undefined,
  currencySymbol?: string | null
): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const num = typeof value === 'number' ? value : stripCurrencyAndParseFloat(value);
  if (isNaN(num)) {
    return '0';
  }

  const formatted = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);

  if (currencySymbol && currencySymbol.trim() !== '') {
    return `${currencySymbol.trim()}${formatted}`;
  }

  return formatted;
}

/**
 * Clean & Spaced Axis Tick Formatting:
 * Eliminates visual collisions on chart axes by:
 * 1. Omission of redundant trailing .00 on integer values (e.g. ₦1,000,000 instead of ₦1,000,000.00, ₦0 instead of ₦0.00).
 * 2. Retaining full fractional precision only when non-zero decimals exist (e.g. ₦12.50).
 * 3. Adding currency prefix only when designated.
 */
export function formatAxisTick(
  value: number | string | null | undefined,
  currencySymbol?: string | null
): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const num = typeof value === 'number' ? value : stripCurrencyAndParseFloat(value);
  if (isNaN(num)) {
    return String(value);
  }

  const hasDecimals = !Number.isInteger(num) && Math.abs(num % 1) >= 0.005;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });

  if (currencySymbol && currencySymbol.trim() !== '') {
    return `${currencySymbol.trim()}${formatted}`;
  }

  return formatted;
}

/**
 * Exact Margin Formatting:
 * Formats the exact difference/margin between performers with full precision:
 * - Commas for thousands (e.g. 3,533,400)
 * - Retains currency symbol if applicable
 * - Exactly 2 decimal points if fractional, or integer without trailing .00 (e.g. ₦3,533,400, ₦430, $415, ₦1,234.50)
 */
export function formatExactMargin(
  value: number | string | null | undefined,
  currencySymbol?: string | null
): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const num = typeof value === 'number' ? value : stripCurrencyAndParseFloat(value);
  if (isNaN(num)) {
    return '0';
  }

  const rounded = Math.round(num * 100) / 100;
  const hasDecimals = !Number.isInteger(rounded) && Math.abs(rounded % 1) >= 0.005;

  const formatted = rounded.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });

  if (currencySymbol && currencySymbol.trim() !== '') {
    return `${currencySymbol.trim()}${formatted}`;
  }

  return formatted;
}

