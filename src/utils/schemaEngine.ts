import {
  ColumnMeta,
  DatasetSchema,
  KpiConfigItem,
  ChartType,
  SalesRecord,
} from '../types';

/**
 * Normalizes string keys for fuzzy matching
 */
function norm(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if a string looks like a date
 */
function isDateString(val: string): boolean {
  if (!val || val.trim().length < 4) return false;
  const trimmed = val.trim();
  // YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed)) return true;
  // MM/DD/YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(trimmed)) return true;
  // Excel serial date 40000 - 55000
  if (/^\d{5}$/.test(trimmed)) return true;
  // Parseable date with timestamp
  const d = Date.parse(trimmed);
  return !isNaN(d) && trimmed.length > 5;
}

/**
 * Cleans numerical value string: handles $, €, £, %, commas, spaces, negatives
 */
export function cleanNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim();
  if (str === '' || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') {
    return null;
  }
  const clean = str.replace(/[$€£¥₦,%\s]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * Analyzes dataset structure, discovers column semantics, and determines optimal KPIs and chart type
 */
export function inferDatasetSchema(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  datasetTitle: string = ''
): DatasetSchema {
  const numRows = rows.length;
  const columns: ColumnMeta[] = [];

  headers.forEach((header, colIdx) => {
    const rawValues = rows.map((r) => (r && r[colIdx] !== undefined ? String(r[colIdx]).trim() : ''));
    const nonEmpty = rawValues.filter((v) => v !== '');

    // Check numeric propensity
    let numericCount = 0;
    const numbers: number[] = [];
    let hasCurrencySymbol = false;

    nonEmpty.forEach((v) => {
      if (/[$€£¥]/.test(v)) hasCurrencySymbol = true;
      const num = cleanNumber(v);
      if (num !== null) {
        numericCount++;
        numbers.push(num);
      }
    });

    const isNumericPropensity = nonEmpty.length > 0 && numericCount / nonEmpty.length >= 0.75;
    const isDatePropensity = !isNumericPropensity && nonEmpty.length > 0 && nonEmpty.filter(isDateString).length / nonEmpty.length >= 0.6;

    // Unique values
    const uniqueSet = new Set(nonEmpty);
    const uniqueValuesCount = uniqueSet.size;

    const normHeader = norm(header);

    // Determine type
    let colType: 'numeric' | 'categorical' | 'date' | 'id' = 'categorical';
    if (isDatePropensity || normHeader.includes('date') || normHeader.includes('time') || normHeader.includes('day') || normHeader.includes('month')) {
      colType = 'date';
    } else if (
      isNumericPropensity &&
      !normHeader.endsWith('id') &&
      !normHeader.endsWith('number') &&
      !normHeader.endsWith('code') &&
      !normHeader.endsWith('tag')
    ) {
      colType = 'numeric';
    } else if (
      normHeader.includes('id') ||
      normHeader.includes('number') ||
      normHeader.includes('tag') ||
      normHeader.includes('code') ||
      normHeader.includes('ticket') ||
      normHeader.includes('invoice') ||
      (uniqueValuesCount === numRows && numRows > 10)
    ) {
      colType = 'id';
    }

    // Numerical aggregates
    let sum = 0;
    let avg = 0;
    let min = 0;
    let max = 0;
    let median = 0;

    if (colType === 'numeric' && numbers.length > 0) {
      sum = numbers.reduce((a, b) => a + b, 0);
      avg = sum / numbers.length;
      numbers.sort((a, b) => a - b);
      min = numbers[0];
      max = numbers[numbers.length - 1];
      const mid = Math.floor(numbers.length / 2);
      median = numbers.length % 2 !== 0 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2;
    }

    columns.push({
      key: header,
      label: header,
      type: colType,
      uniqueValuesCount,
      sampleValues: Array.from(uniqueSet).slice(0, 5),
      isCurrency: hasCurrencySymbol || /price|amount|cost|revenue|mrr|arr|fee|salary|spend|total|retail|val/i.test(normHeader),
      sum,
      avg,
      min,
      max,
      median,
    });
  });

  // 1. Identify Best Primary Metric
  // Keywords priority: revenue, amount, price, mrr, arr, cost, fee, total, spend, salary, sales, value
  const metricKeywords = ['revenue', 'sales', 'mrr', 'arr', 'amount', 'price', 'cost', 'fee', 'spend', 'total', 'salary', 'retail', 'value', 'budget', 'volume', 'qty'];
  let primaryMetric = columns.find((c) => c.type === 'numeric' && metricKeywords.some((kw) => norm(c.key).includes(kw)))?.key;
  if (!primaryMetric) {
    primaryMetric = columns.find((c) => c.type === 'numeric')?.key || headers[0] || 'Amount';
  }

  // Secondary metric (e.g. Units, Seats, Quantity, Hours)
  const secondaryMetric = columns.find((c) => c.type === 'numeric' && c.key !== primaryMetric)?.key;

  // 2. Identify Best Primary Dimension
  // Keywords: product, item, tier, plan, category, department, service, description, garment, name, hardware, package
  const dimensionKeywords = ['product', 'item', 'tier', 'plan', 'category', 'department', 'hardware', 'package', 'garment', 'service', 'account', 'client', 'description', 'name', 'type'];
  let primaryDimension = columns.find((c) => c.type === 'categorical' && dimensionKeywords.some((kw) => norm(c.key).includes(kw)))?.key;
  if (!primaryDimension) {
    // Pick categorical column with best distribution (between 3 and 100 unique values)
    primaryDimension = columns.find((c) => c.type === 'categorical' && c.uniqueValuesCount >= 2 && c.uniqueValuesCount <= 100)?.key;
  }
  if (!primaryDimension) {
    primaryDimension = columns.find((c) => c.type === 'categorical')?.key || headers[1] || headers[0];
  }

  // 3. Identify Secondary Dimension
  // Keywords: channel, method, frequency, gateway, supplier, vendor, level, status, region, country, access
  const secondaryKeywords = ['channel', 'method', 'frequency', 'gateway', 'supplier', 'vendor', 'level', 'status', 'region', 'access', 'type'];
  const secondaryDimension = columns.find((c) => c.type === 'categorical' && c.key !== primaryDimension && secondaryKeywords.some((kw) => norm(c.key).includes(kw)))?.key;

  // 4. Identify Date Column
  const dateColumn = columns.find((c) => c.type === 'date')?.key || columns.find((c) => /date|time|day|period|month/i.test(norm(c.key)))?.key;

  // 5. Identify ID Column
  const idColumn = columns.find((c) => c.type === 'id')?.key || columns.find((c) => /id|num|code|tag|ticket|invoice|ref/i.test(norm(c.key)))?.key;

  // 6. Intelligent Chart Type Thinking
  let recommendedChartType: ChartType = 'bar';
  const primaryDimMeta = columns.find((c) => c.key === primaryDimension);
  const primaryMetricMeta = columns.find((c) => c.key === primaryMetric);

  const titleLower = datasetTitle.toLowerCase();
  let domainCategory = 'General Business';
  if (titleLower.includes('coffee') || titleLower.includes('bakery') || titleLower.includes('pos')) domainCategory = 'POS & Dining';
  else if (titleLower.includes('apparel') || titleLower.includes('fashion') || titleLower.includes('retail')) domainCategory = 'Retail & E-Commerce';
  else if (titleLower.includes('saas') || titleLower.includes('subscription') || titleLower.includes('mrr')) domainCategory = 'SaaS & Subscriptions';
  else if (titleLower.includes('hardware') || titleLower.includes('procurement')) domainCategory = 'Procurement & Assets';
  else if (titleLower.includes('gym') || titleLower.includes('fitness')) domainCategory = 'Memberships & Wellness';

  if (primaryDimMeta && primaryDimMeta.uniqueValuesCount >= 2 && primaryDimMeta.uniqueValuesCount <= 5) {
    // Few categories -> Donut or Pie chart is optimal
    recommendedChartType = 'donut';
  } else if (dateColumn && columns.find((c) => c.key === dateColumn)!.uniqueValuesCount >= 5) {
    // Strong temporal timeline -> Line chart is optimal
    recommendedChartType = 'line';
  } else if (primaryDimMeta && primaryDimMeta.uniqueValuesCount > 10) {
    // Many entities -> Horizontal Bar is optimal for readable ranking
    recommendedChartType = 'horizontal-bar';
  } else if (secondaryDimension) {
    recommendedChartType = 'bar';
  }

  // 7. Auto-Generate Relatable, Dataset-Specific KPIs
  const totalVal = primaryMetricMeta?.sum || 0;
  const avgVal = primaryMetricMeta?.avg || 0;
  const isCurrency = primaryMetricMeta?.isCurrency ?? true;

  const currencySymbol = primaryMetricMeta?.key?.includes('NGN') ? '₦' : '$';

  const formatVal = (num: number): string => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return isCurrency
      ? `${currencySymbol}${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
      : num.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  // Find leading entity in primary dimension
  const dimIdx = headers.indexOf(primaryDimension);
  const metricIdx = headers.indexOf(primaryMetric);
  const entityTotals: Record<string, number> = {};

  rows.forEach((r) => {
    if (!r) return;
    const ent = r[dimIdx] ? String(r[dimIdx]).trim() : '(Unspecified)';
    const num = metricIdx !== -1 && r[metricIdx] !== undefined ? cleanNumber(r[metricIdx]) || 0 : 1;
    entityTotals[ent] = (entityTotals[ent] || 0) + num;
  });

  const sortedEntities = Object.entries(entityTotals).sort((a, b) => b[1] - a[1]);
  const topEntity = sortedEntities[0] ? sortedEntities[0][0] : 'N/A';
  const topEntityVal = sortedEntities[0] ? sortedEntities[0][1] : 0;
  const topEntityShare = totalVal > 0 ? (topEntityVal / totalVal) * 100 : 0;

  // Secondary dimension top entity if available
  let secTopEntity = 'N/A';
  let secTopShare = 0;
  if (secondaryDimension) {
    const secIdx = headers.indexOf(secondaryDimension);
    const secTotals: Record<string, number> = {};
    rows.forEach((r) => {
      if (!r) return;
      const ent = r[secIdx] ? String(r[secIdx]).trim() : '(Other)';
      const num = metricIdx !== -1 && r[metricIdx] !== undefined ? cleanNumber(r[metricIdx]) || 0 : 1;
      secTotals[ent] = (secTotals[ent] || 0) + num;
    });
    const sortedSec = Object.entries(secTotals).sort((a, b) => b[1] - a[1]);
    if (sortedSec[0]) {
      secTopEntity = sortedSec[0][0];
      secTopShare = totalVal > 0 ? (sortedSec[0][1] / totalVal) * 100 : 0;
    }
  }

  const kpis: KpiConfigItem[] = [
    {
      title: `Total ${primaryMetric}`,
      value: formatVal(totalVal),
      subtext: `${numRows} audited records processed`,
      iconType: 'dollar',
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/60',
    },
    {
      title: `Average ${primaryMetric}`,
      value: formatVal(avgVal),
      subtext: `Median: ${formatVal(primaryMetricMeta?.median || 0)}`,
      iconType: 'activity',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
    },
    {
      title: `Leading ${primaryDimension}`,
      value: topEntity,
      subtext: `${(topEntityShare ?? 0).toFixed(1)}% share (${formatVal(topEntityVal)})`,
      iconType: 'award',
      iconColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/60',
      truncate: true,
    },
    {
      title: secondaryMetric ? `Total ${secondaryMetric}` : `Total ${idColumn || 'Records'}`,
      value: secondaryMetric
        ? columns.find((c) => c.key === secondaryMetric)?.sum?.toLocaleString() || String(numRows ?? 0)
        : (numRows ?? 0).toLocaleString(),
      subtext: `${primaryDimMeta?.uniqueValuesCount || 0} distinct ${primaryDimension}s`,
      iconType: 'layers',
      iconColor: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-950/60',
    },
    {
      title: secondaryDimension ? `Top ${secondaryDimension}` : `Observation Horizon`,
      value: secondaryDimension ? secTopEntity : (dateColumn ? `${columns.find((c) => c.key === dateColumn)?.uniqueValuesCount || 0} Periods` : 'Verified'),
      subtext: secondaryDimension ? `${(secTopShare ?? 0).toFixed(1)}% preferred channel` : (dateColumn ? `Timeline tracked` : 'Data health clean'),
      iconType: secondaryDimension ? 'credit-card' : 'calendar',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/60',
      truncate: true,
    },
  ];

  return {
    columns,
    primaryMetric,
    secondaryMetric,
    primaryDimension,
    secondaryDimension,
    dateColumn,
    idColumn,
    recommendedChartType,
    domainCategory,
    kpis,
  };
}

/**
 * Transforms a raw matrix into dynamic records with schema metadata attached
 */
export function matrixToDynamicRecords(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  schema: DatasetSchema
): SalesRecord[] {
  const metricIdx = headers.indexOf(schema.primaryMetric);
  const dimIdx = headers.indexOf(schema.primaryDimension);
  const secDimIdx = schema.secondaryDimension ? headers.indexOf(schema.secondaryDimension) : -1;
  const dateIdx = schema.dateColumn ? headers.indexOf(schema.dateColumn) : -1;
  const idIdx = schema.idColumn ? headers.indexOf(schema.idColumn) : -1;

  const today = new Date().toISOString().split('T')[0];

  return rows.map((r, i) => {
    const rec: Record<string, any> = {
      id: `dyn-rec-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
    };

    // Store all original key-value pairs
    headers.forEach((h, colIdx) => {
      rec[h] = r && r[colIdx] !== undefined ? r[colIdx] : '';
    });

    // Provide standard alias fields so chart & filter engines work seamlessly
    const priceVal = metricIdx !== -1 && r[metricIdx] !== undefined ? cleanNumber(r[metricIdx]) || 0 : 0;
    const prodVal = dimIdx !== -1 && r[dimIdx] ? String(r[dimIdx]).trim() : `Item ${i + 1}`;
    const payVal = secDimIdx !== -1 && r[secDimIdx] ? String(r[secDimIdx]).trim() : 'Direct';
    const dateVal = dateIdx !== -1 && r[dateIdx] ? String(r[dateIdx]).trim() : today;
    const idVal = idIdx !== -1 && r[idIdx] ? String(r[idIdx]).trim() : `ORD-${1000 + i + 1}`;

    rec.price = priceVal;
    rec.product = prodVal;
    rec.paymentMethod = payVal;
    rec.date = dateVal;
    rec.orderNumber = idVal;

    return rec as SalesRecord;
  });
}
