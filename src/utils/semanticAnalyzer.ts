/**
 * Semantic Mapping Engine & Intelligent Aggregation Engine
 * Adheres strictly to:
 * 1. Semantic Column Classification into 4 strict buckets (Identifiers, Temporal, Categorical, Financial/Numeric)
 * 2. Intelligent Aggregation & Math Safety (zero fallback, descending sort by primary metric)
 * 3. Strict Chart Routing & Theming Heuristics
 * 4. Number Formatting with Intl.NumberFormat & Narrative Synthesis ("Key Takeaways")
 * 5. Deep Currency Detection & Math Safety (regex strip currency symbols, commas, spaces to float)
 */

import {
  detectCurrency,
  getColumnCurrency,
  setColumnCurrency,
  registerDatasetCurrencies,
  stripCurrencyAndParseFloat,
  formatNumber,
  formatCompactNumber,
  formatExactMargin,
} from './currencyEngine';
import { isOmniNull } from './omniNull';
import { cleanFloat } from './cleanFloat';

export {
  detectCurrency,
  getColumnCurrency,
  setColumnCurrency,
  registerDatasetCurrencies,
  stripCurrencyAndParseFloat,
  formatNumber,
  formatCompactNumber,
  formatExactMargin,
  isOmniNull,
  cleanFloat,
};

export interface CategoricalColumnMeta {
  key: string;
  label: string;
  cardinality: number;
  uniqueValues: string[];
}

export interface SemanticClassification {
  identifiers: string[];
  temporal: string[];
  categorical: CategoricalColumnMeta[];
  financialNumeric: string[];
  primaryMetric: string;
  primaryDimension: string;
  recommendedChartType: 'line' | 'bar' | 'horizontal-bar' | 'donut';
  currencySymbol: string;
  columnCurrencies: Record<string, string>;
}

export interface AggregatedResultPoint {
  name: string;
  displayName: string;
  value: number;
  revenue: number; // Backward-compatible alias
  formattedValue: string;
  percentage: number;
  volume: number;
  [key: string]: any;
}

/**
 * Format any number with Intl.NumberFormat ensuring comma separation and max 2 decimal places.
 */
export function formatIntlNumber(
  value: number,
  options?: {
    isCurrency?: boolean;
    currencySymbol?: string;
    maxDecimals?: number;
    compact?: boolean;
  }
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  const isCurrency = options?.isCurrency ?? false;
  const currencySymbol = options?.currencySymbol || '$';

  if (options?.compact && Math.abs(value) >= 1_000_000) {
    const compactVal = (value / 1_000_000).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return isCurrency ? `${currencySymbol}${compactVal}M` : `${compactVal}M`;
  }

  if (options?.compact && Math.abs(value) >= 1_000) {
    const compactVal = (value / 1_000).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return isCurrency ? `${currencySymbol}${compactVal}k` : `${compactVal}k`;
  }

  return formatNumber(value, isCurrency ? currencySymbol : null);
}

/**
 * Clean string or number cell to valid float. Returns 0 on empty, null, undefined or NaN for Math Safety.
 * Uses strict regex stripping of all currency symbols, commas, and spaces.
 */
export function safeNumber(val: any): number {
  return stripCurrencyAndParseFloat(val);
}

/**
 * Detects if a sample string is a parseable date
 */
function isValidDateString(val: string): boolean {
  if (!val || val.trim().length < 4) return false;
  const trimmed = val.trim();
  // YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed)) return true;
  // MM/DD/YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(trimmed)) return true;
  // Month Name + Year e.g. Jan 2024 or 2024-03
  if (/^[A-Za-z]{3,9}\s+\d{4}$/.test(trimmed) || /^\d{4}-\d{2}$/.test(trimmed)) return true;
  const parsed = Date.parse(trimmed);
  return !isNaN(parsed) && trimmed.length > 5 && !/^\d+$/.test(trimmed);
}

/**
 * A. Semantic Column Classification:
 * Categorizes columns into four strict buckets:
 * 1. Identifiers (Dimensions): Any column containing "ID", "Key", "#", or UUIDs. Forced to behave as strings. NEVER summed.
 * 2. Temporal (Dimensions): Any column parsing as valid Date, or containing "Date", "Month", "Year".
 * 3. Categorical (Dimensions): Text strings. Calculates cardinality (unique values count).
 * 4. Financial/Numeric (Metrics): True mathematical numbers (Revenue, Cost, Profit, Quantities, Salaries, etc.).
 */
export function classifyColumns(
  headers: string[],
  rows: Record<string, any>[]
): SemanticClassification {
  const identifiers: string[] = [];
  const temporal: string[] = [];
  const categorical: CategoricalColumnMeta[] = [];
  const financialNumeric: string[] = [];

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const identifierKeywordPattern = /(^|\b|_)(id|key|#|uuid|guid|code|ticket|invoice|ref|num|number|tag|sku)($|\b|_)/i;
  const temporalKeywordPattern = /(^|\b|_)(date|time|day|month|year|period|quarter|week)($|\b|_)/i;
  const financialKeywordPattern = /(^|\b|_)(revenue|sales|price|cost|amount|budget|spend|salary|fee|fees|profit|total|val|value|margin|earning|ngn|usd|eur|gbp)($|\b|_)/i;

  // Batch register and detect currencies for all columns
  const columnCurrencies = registerDatasetCurrencies(headers, rows);

  headers.forEach((header) => {
    const rawValues = rows.map((r) => r[header]);
    // Smart Column Typing: Evaluate the majority of VALID cells.
    // Ignore cells matching the Omni-Null Array during this check so that "N/A"
    // does not cause a numeric column to be misclassified as categorical text.
    const validCells = rawValues.filter((v) => !isOmniNull(v));

    const normHeader = header.toLowerCase();

    // 1. Check for Identifiers
    const hasIdentifierName =
      header.includes('#') ||
      normHeader.includes('id') ||
      normHeader.includes('key') ||
      normHeader.includes('uuid') ||
      identifierKeywordPattern.test(header);

    const sampleUuidMatch = validCells.some((v) => uuidPattern.test(String(v)));

    if (hasIdentifierName || sampleUuidMatch) {
      // Force to behave as strings. NEVER sum or average these.
      identifiers.push(header);
      return;
    }

    // 2. Check for Temporal
    const hasTemporalName = temporalKeywordPattern.test(header);
    const dateParsedCount = validCells.filter((v) => isValidDateString(String(v))).length;
    const isDatePropensity = validCells.length > 0 && dateParsedCount / validCells.length >= 0.6;

    if (hasTemporalName || isDatePropensity) {
      temporal.push(header);
      return;
    }

    // 3. Check for Financial / Numeric (True Mathematical Numbers)
    const numericParsedCount = validCells.filter((v) => {
      const stripped = String(v).replace(/[₦$£€¥,\s%]/g, '').replace(/\b(ngn|usd|gbp|eur)\b/gi, '');
      return !isNaN(Number(stripped)) && stripped !== '';
    }).length;

    // Evaluates majority of valid cells (ignoring Omni-Null cells):
    const isNumericDominant =
      validCells.length > 0 && numericParsedCount / validCells.length >= 0.5;

    const hasFinancialName = financialKeywordPattern.test(header);

    if (isNumericDominant || (hasFinancialName && numericParsedCount > 0)) {
      financialNumeric.push(header);
      return;
    }

    // 4. Categorical Dimensions: Compute Cardinality
    const uniqueSet = new Set(validCells.map((v) => String(v).trim()));
    categorical.push({
      key: header,
      label: header,
      cardinality: uniqueSet.size,
      uniqueValues: Array.from(uniqueSet),
    });
  });

  // Fallback defaults if dataset lacks specific buckets
  let primaryMetric = financialNumeric[0] || '';
  if (!primaryMetric) {
    primaryMetric = 'Record Count';
  }

  // Primary Dimension heuristic:
  // Prefer categorical with moderate cardinality (between 2 and 15)
  let primaryDimension = '';
  const optimalCategorical = categorical.find((c) => c.cardinality >= 2 && c.cardinality <= 15);
  if (optimalCategorical) {
    primaryDimension = optimalCategorical.key;
  } else if (categorical.length > 0) {
    primaryDimension = categorical[0].key;
  } else if (temporal.length > 0) {
    primaryDimension = temporal[0];
  } else if (identifiers.length > 0) {
    primaryDimension = identifiers[0];
  } else {
    primaryDimension = headers[0] || 'Item';
  }

  // Currency detection
  const detectedPrimaryCurrency = getColumnCurrency(primaryMetric);
  const anyHeaderHasNgn = headers.some((h) => h.includes('NGN') || h.includes('₦'));
  const currencySymbol = detectedPrimaryCurrency || (anyHeaderHasNgn ? '₦' : '$');

  // Chart Type Routing Heuristic:
  // - Line Chart (Trend): ONLY when temporal dimension is chosen / available
  // - Vertical Bar: Categorical with medium cardinality
  // - Horizontal Bar: Fallback when no temporal dimension or categorical has many items
  // - Doughnut: Low cardinality (<= 5 unique values)
  let recommendedChartType: 'line' | 'bar' | 'horizontal-bar' | 'donut' = 'bar';

  const chosenDimMeta = categorical.find((c) => c.key === primaryDimension);
  if (temporal.includes(primaryDimension)) {
    recommendedChartType = 'line';
  } else if (chosenDimMeta && chosenDimMeta.cardinality <= 5) {
    recommendedChartType = 'donut';
  } else if (chosenDimMeta && chosenDimMeta.cardinality > 10) {
    recommendedChartType = 'horizontal-bar';
  } else {
    recommendedChartType = 'bar';
  }

  return {
    identifiers,
    temporal,
    categorical,
    financialNumeric,
    primaryMetric,
    primaryDimension,
    recommendedChartType,
    currencySymbol,
    columnCurrencies,
  };
}

/**
 * B. Intelligent Aggregation & Math Safety:
 * 1. Do not plot raw data rows. Groups by single dimension and SUMS metrics.
 * 2. Math Safety (Crucial): executes regex strip to remove all currency symbols, commas,
 *    and spaces, converting value to pure JavaScript Float. If blank or null, treats as 0.
 * 3. Mandatory Sorting: ALWAYS sorts in descending order based on the primary financial metric!
 *    (Exception: if sorting by temporal dimension for a Line Chart, sorts chronologically)
 */
export function aggregateDimensionMetrics(
  records: Record<string, any>[] = [],
  dimensionKey: string,
  metricKey: string,
  isTemporal = false,
  currencySymbol = '$',
  sortDirection?: 'desc' | 'asc' | 'chronological'
): AggregatedResultPoint[] {
  if (!records || records.length === 0) return [];

  const isCurrency =
    metricKey.toLowerCase().includes('revenue') ||
    metricKey.toLowerCase().includes('price') ||
    metricKey.toLowerCase().includes('cost') ||
    metricKey.toLowerCase().includes('salary') ||
    metricKey.toLowerCase().includes('fees') ||
    metricKey.toLowerCase().includes('spend') ||
    metricKey.toLowerCase().includes('budget') ||
    metricKey.toLowerCase().includes('ngn') ||
    metricKey.toLowerCase().includes('amount') ||
    !!getColumnCurrency(metricKey);

  const groups: Record<string, { sum: number; count: number }> = {};
  let totalAggregateSum = 0;

  records.forEach((record) => {
    // Dimension string
    const rawDim = record[dimensionKey];
    const groupName =
      rawDim !== null && rawDim !== undefined && String(rawDim).trim() !== ''
        ? String(rawDim).trim()
        : '(Unspecified)';

    // Math Safety: Use cleanFloat ONLY right before running SUM/AVERAGE aggregation.
    // NEVER mutate the raw record or window.activeDataset.
    let metricValue = 0;
    if (metricKey === 'volume' || metricKey === 'count' || metricKey === 'records') {
      metricValue = 1;
    } else {
      metricValue = cleanFloat(record[metricKey]);
    }

    if (!groups[groupName]) {
      groups[groupName] = { sum: 0, count: 0 };
    }

    groups[groupName].sum += metricValue;
    groups[groupName].count += 1;
    totalAggregateSum += metricValue;
  });

  const points: AggregatedResultPoint[] = Object.entries(groups).map(([name, data]) => {
    const value = Math.round(data.sum * 100) / 100;
    const percentage =
      totalAggregateSum > 0
        ? Math.round((value / totalAggregateSum) * 1000) / 10
        : 0;

    return {
      name,
      displayName: name,
      value,
      revenue: value, // Backward-compatible alias
      formattedValue: formatNumber(value, isCurrency ? currencySymbol : null),
      percentage,
      volume: data.count,
    };
  });

  // Sorting: Preserve all individual items without arbitrary truncation
  let sortedPoints: AggregatedResultPoint[] = [];
  const effectiveSort = sortDirection || (isTemporal ? 'chronological' : 'desc');

  if (effectiveSort === 'chronological') {
    // Sort chronologically for timeline charts
    sortedPoints = points.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  } else if (effectiveSort === 'asc') {
    // Ascending sort (e.g., lowest, cheapest, worst)
    sortedPoints = points.sort((a, b) => a.value - b.value);
  } else {
    // Always sort descending based on primary financial metric
    sortedPoints = points.sort((a, b) => b.value - a.value);
  }

  return sortedPoints;
}

function pluralizeDimension(dim: string): string {
  const d = dim.trim();
  if (d.endsWith('s') || d.endsWith('S')) return d;
  if (d.toLowerCase().endsWith('category')) return d.slice(0, -1) + 'ies';
  if (d.toLowerCase().endsWith('city')) return d.slice(0, -1) + 'ies';
  if (d.toLowerCase().endsWith('country')) return d.slice(0, -1) + 'ies';
  if (d.endsWith('y') && !/[aeiou]y$/i.test(d)) return d.slice(0, -1) + 'ies';
  if (/(?:ch|sh|x|z)$/i.test(d)) return `${d}es`;
  return `${d}s`;
}

function singularizeDimension(dim: string): string {
  const d = dim.trim();
  if (d.toLowerCase() === 'employee role') return 'role';
  if (d.toLowerCase().endsWith('categories')) return d.slice(0, -3) + 'y';
  if (d.toLowerCase().endsWith('cities')) return d.slice(0, -3) + 'y';
  if (d.toLowerCase().endsWith('countries')) return d.slice(0, -3) + 'y';
  if (
    d.toLowerCase().endsWith('ies') &&
    !d.toLowerCase().endsWith('series') &&
    !d.toLowerCase().endsWith('species')
  ) {
    return d.slice(0, -3) + 'y';
  }
  if (/(?:ches|shes|xes|zes)$/i.test(d)) return d.slice(0, -2);
  if (d.endsWith('s') || d.endsWith('S')) return d.slice(0, -1);
  return d;
}

/**
 * Narrative Synthesis ("Key Takeaways"):
 * Generates executive-style, highly concise insights with strict structural rules:
 * 1. Structured Bold Labels: Top Performer:, Concentration:, and Performance Gap:
 * 2. Compact Number Abbreviation: uses formatCompactNumber (Intl.NumberFormat with notation: 'compact')
 * 3. Dynamic & Specific Phrasing: template literals with actual dimension and category names, no generic terms
 * 4. Single-Category Fallback: omit Concentration and Performance Gap if categories < 2
 * 5. Divide-by-Zero Protection: if runnerUp is 0, fall back to "The top [Dimension Name] accounted for 100% of the active volume."
 */
export function generateKeyTakeaways(
  aggregatedData: AggregatedResultPoint[],
  dimensionName: string,
  metricName: string,
  currencySymbol = '$'
): string[] {
  if (!aggregatedData || aggregatedData.length === 0) {
    return ['No aggregated data available to synthesize takeaways.'];
  }

  const resolvedCurrency = getColumnCurrency(metricName) || currencySymbol || '$';
  const isCurrency =
    metricName.toLowerCase().includes('revenue') ||
    metricName.toLowerCase().includes('price') ||
    metricName.toLowerCase().includes('cost') ||
    metricName.toLowerCase().includes('salary') ||
    metricName.toLowerCase().includes('fees') ||
    metricName.toLowerCase().includes('fee') ||
    metricName.toLowerCase().includes('spend') ||
    metricName.toLowerCase().includes('budget') ||
    metricName.toLowerCase().includes('ngn') ||
    metricName.toLowerCase().includes('amount') ||
    metricName.toLowerCase().includes('naira') ||
    metricName.toLowerCase().includes('dollar') ||
    !!getColumnCurrency(metricName);

  const activeSymbol = isCurrency ? resolvedCurrency : null;
  const totalMetric = aggregatedData.reduce((acc, p) => acc + (p.value ?? 0), 0);
  const topPerformer = aggregatedData[0];

  const bullets: string[] = [];

  // Bullet 1: Top Performer
  const topShare =
    totalMetric > 0 && topPerformer
      ? Math.round(((topPerformer.value ?? 0) / totalMetric) * 100)
      : 100;
  const formattedTopVal = formatCompactNumber(topPerformer?.value ?? 0, activeSymbol);

  bullets.push(
    `Top Performer: ${topPerformer?.name || 'Leading Category'} accounted for ${formattedTopVal} (${topShare}% of total ${metricName}).`
  );

  // CRITICAL Math Safety & Array Checks:
  // Single-Category Fallback: Check if the dataset has at least 2 categories
  if (aggregatedData.length >= 2) {
    const cleanDim = dimensionName.trim();
    const dimPlural = pluralizeDimension(cleanDim);
    const dimNoun = singularizeDimension(cleanDim).toLowerCase();

    // Bullet 2: Concentration
    const topCount = Math.min(3, aggregatedData.length);
    const topSum = aggregatedData.slice(0, topCount).reduce((acc, p) => acc + (p.value ?? 0), 0);
    const topSumShare = totalMetric > 0 ? Math.round((topSum / totalMetric) * 100) : 100;
    const formattedTopSum = formatCompactNumber(topSum, activeSymbol);

    bullets.push(
      `Concentration: The top ${topCount} ${dimPlural} account for ${topSumShare}% (${formattedTopSum}) of the total ${metricName}.`
    );

    // Bullet 3: Performance Gap
    const runnerUp = aggregatedData[1];
    const runnerUpVal = runnerUp?.value ?? 0;
    const topVal = topPerformer?.value ?? 0;

    // Divide-by-Zero or Non-Positive Protection
    if (runnerUpVal <= 0) {
      bullets.push(
        `Performance Gap: The top ${dimNoun} (${topPerformer?.name || 'Top'}) accounted for 100% of the active volume.`
      );
    } else if (Math.abs(topVal - runnerUpVal) < 0.000001) {
      bullets.push(
        `Performance Gap: The top ${dimNoun} (${topPerformer?.name}) and runner-up (${runnerUp?.name}) are tied at ${formatCompactNumber(topVal, activeSymbol)} each.`
      );
    } else {
      const rawMultiplier = topVal / runnerUpVal;
      const leadVal = topVal - runnerUpVal;
      const pctLead = ((topVal - runnerUpVal) / runnerUpVal) * 100;
      const formattedLead = formatExactMargin(leadVal, activeSymbol);

      // If the difference is very close (<5%), a multiplier rounds toward 1.0x which is misleading
      if (rawMultiplier < 1.05) {
        const pctFormatted =
          pctLead < 0.05
            ? '<0.1'
            : pctLead.toFixed(1).replace(/\.0$/, '');
        bullets.push(
          `Performance Gap: The top ${dimNoun} (${topPerformer?.name}) edged out the runner-up (${runnerUp?.name}) by +${pctFormatted}% (+${formattedLead} margin).`
        );
      } else {
        // High accuracy multiplier formatted to 2 decimal places (or trimmed if integer / clean 1 decimal)
        // e.g. 3.1925 -> 3.19x (never 3.2x), 1.6500 -> 1.65x (never 1.6x), 2.0 -> 2x, 2.50 -> 2.5x
        let multiplierStr: string;
        if (Number.isInteger(rawMultiplier)) {
          multiplierStr = `${rawMultiplier}x`;
        } else {
          const fixed2 = rawMultiplier.toFixed(2);
          multiplierStr = `${parseFloat(fixed2)}x`;
        }

        bullets.push(
          `Performance Gap: The top ${dimNoun} (${topPerformer?.name}) outpaced the runner-up (${runnerUp?.name}) by ${multiplierStr} (+${formattedLead} margin).`
        );
      }
    }
  }

  return bullets;
}
