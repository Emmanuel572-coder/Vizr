import { SemanticClassification } from './semanticAnalyzer';

export interface ProcessQuestionResult {
  success: boolean;
  dimension?: string;
  metric?: string;
  chartType?: 'bar' | 'horizontal-bar' | 'line' | 'donut';
  sortDirection?: 'desc' | 'asc' | 'chronological';
  explanation?: string;
  error?: string;
}

export interface NLContext {
  headers: string[];
  semanticInfo: SemanticClassification;
  records: Record<string, any>[];
  currentDimension: string;
  currentMetric: string;
  currentChartType: 'bar' | 'horizontal-bar' | 'line' | 'donut';
}

/**
 * Exact polite fallback message required when queries are too complex for the local engine.
 */
export const COMPLEX_QUERY_FALLBACK_MESSAGE =
  "This query is a bit too complex. Try a simpler breakdown like 'Show me [Metric] by [Group by]'.";

/**
 * Complex mathematical or exclusion operators that local JS engine cannot reliably execute.
 */
const COMPLEX_FIREWALL_OPERATORS = [
  'minus',
  'excluding',
  'exclude',
  'without',
  'divided by',
  'divide by',
  'divided',
  'multiplied by',
  'multiply by',
  'multiply',
  'times',
  'plus',
  'rolling',
  'moving average',
  'moving avg',
  'standard deviation',
  'std dev',
  'variance',
  'correlation',
  'regression',
  'percentage of',
  'ratio of',
  'forecast',
  'predict',
  'filter out',
];

/**
 * Intent Dictionaries:
 * - Descending sort: "top", "best", "most", "highest", "expensive", etc.
 * - Ascending sort: "worst", "lowest", "least", "cheapest", etc.
 * - Temporal / Trend: "trend", "history", "overtime", "over time", etc.
 */
const INTENT_SORT_DESC = [
  'top',
  'best',
  'most',
  'highest',
  'expensive',
  'max',
  'maximum',
  'peak',
  'leader',
  'leaders',
  'greatest',
  'largest',
];

const INTENT_SORT_ASC = [
  'worst',
  'lowest',
  'least',
  'cheapest',
  'bottom',
  'minimum',
  'min',
  'smallest',
  'fewest',
];

const INTENT_TREND = [
  'trend',
  'history',
  'overtime',
  'over time',
  'timeline',
  'daily',
  'monthly',
  'yearly',
  'annual',
  'by date',
  'by month',
  'by day',
  'by year',
];

/**
 * Known business synonyms for metric & dimension extraction.
 */
const METRIC_SYNONYMS: Record<string, string[]> = {
  revenue: ['revenue', 'sales', 'turnover', 'income', 'earning', 'earnings', 'gross', 'money', 'inflow'],
  price: ['price', 'pricing', 'rate', 'unit price', 'cost per'],
  cost: ['cost', 'costs', 'fuel cost', 'expense', 'expenses', 'spend', 'spending', 'expenditure', 'outgoing', 'outgoings'],
  budget: ['budget', 'planned budget', 'allocation', 'target'],
  salary: ['salary', 'salaries', 'pay', 'payment', 'payroll', 'compensation', 'wage', 'wages', 'stipend', 'take-home'],
  fee: ['fee', 'fees', 'charge', 'charges', 'tariff', 'tariffs', 'duty', 'duties', 'tax'],
  volume: ['volume', 'count', 'frequency', 'transactions', 'orders', 'records', 'number of', 'total rows', 'number', 'qty', 'quantity', 'rides', 'flights'],
  score: ['score', 'scores', 'performance', 'rating', 'ratings', 'points', 'grade'],
  tons: ['ton', 'tons', 'tonnage', 'weight', 'exports', 'export volume', 'cargo'],
};

const DIMENSION_SYNONYMS: Record<string, string[]> = {
  item: ['item', 'items', 'product', 'products', 'sku', 'skus', 'goods', 'merchandise', 'article', 'articles', 'device', 'devices'],
  region: ['region', 'regions', 'location', 'locations', 'city', 'cities', 'state', 'states', 'destination', 'destinations', 'area', 'areas', 'place', 'places', 'market', 'markets'],
  role: ['role', 'roles', 'employee', 'employees', 'title', 'titles', 'position', 'positions', 'job', 'jobs', 'staff', 'designation'],
  level: ['level', 'levels', 'grade', 'grades', 'seniority', 'tier', 'rank'],
  route: ['route', 'routes', 'trip', 'trips', 'line', 'lines', 'corridor', 'corridors', 'transit'],
  vehicle: ['vehicle', 'vehicles', 'bus', 'danfo', 'brt', 'fleet', 'car', 'cars', 'truck', 'trucks', 'ship', 'vessel'],
  crop: ['crop', 'crops', 'produce', 'commodity', 'commodities', 'agriculture', 'cashew', 'cocoa', 'grain'],
  category: ['category', 'categories', 'type', 'types', 'sector', 'department', 'class'],
  payment: ['payment', 'payments', 'payment method', 'channel', 'mode', 'tender'],
  status: ['status', 'condition', 'state'],
  date: ['date', 'time', 'day', 'month', 'year', 'timeline', 'period'],
};

/**
 * Clean & sanitize query: lowercase and remove extraneous punctuation.
 */
export function sanitizeQuery(query: string): string {
  if (!query) return '';
  return query
    .toLowerCase()
    .replace(/['"?,.!;:@#$%^&*()_+={}\[\]|\\<>\/`~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a string contains any of the search tokens as full words or phrases.
 */
function containsPhrase(text: string, phrase: string): boolean {
  const cleanPhrase = phrase.toLowerCase().trim();
  if (!cleanPhrase) return false;
  // Match as word boundary or subphrase
  const regex = new RegExp(`(^|\\b)${cleanPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\b|$)`, 'i');
  return regex.test(text);
}

/**
 * Matches candidate column against query string using name tokens & synonyms.
 */
function scoreColumnMatch(query: string, colName: string, isMetric: boolean): number {
  const cleanCol = colName.toLowerCase().replace(/[\(\)\[\]\{\}\/_\-]/g, ' ').replace(/\s+/g, ' ').trim();
  let score = 0;

  // Exact full name match
  if (containsPhrase(query, cleanCol) || containsPhrase(query, colName.toLowerCase())) {
    score += 10;
  }

  // Individual significant words of column name (> 2 chars)
  const colWords = cleanCol.split(' ').filter((w) => w.length > 2 && !['and', 'for', 'the', 'per', 'ngn', 'usd'].includes(w));
  for (const word of colWords) {
    if (containsPhrase(query, word)) {
      score += 4;
    }
  }

  // Synonym matching
  const synonymDict = isMetric ? METRIC_SYNONYMS : DIMENSION_SYNONYMS;
  for (const [key, synonyms] of Object.entries(synonymDict)) {
    // If the column name relates to this synonym key
    if (cleanCol.includes(key)) {
      for (const syn of synonyms) {
        if (containsPhrase(query, syn)) {
          score += 3;
        }
      }
    }
  }

  return score;
}

/**
 * Smart Heuristic Engine (JavaScript NLP):
 * Processes an unstructured natural language question from the user and dynamically
 * maps it to the dataset's Schema, Dimensions, Metrics, Sort Order, and Chart Type.
 */
export function processUserQuestion(
  rawQuery: string,
  context: NLContext
): ProcessQuestionResult {
  const query = sanitizeQuery(rawQuery);

  if (!query || query.length === 0) {
    return {
      success: false,
      error: COMPLEX_QUERY_FALLBACK_MESSAGE,
    };
  }

  // ==========================================
  // D. THE COMPLEXITY FIREWALL & GRACEFUL FAILURE (CRITICAL)
  // ==========================================

  // Check 1: Exclusion / Complex mathematical operators
  for (const op of COMPLEX_FIREWALL_OPERATORS) {
    if (containsPhrase(query, op)) {
      return {
        success: false,
        error: COMPLEX_QUERY_FALLBACK_MESSAGE,
      };
    }
  }

  // ==========================================
  // B. INTENT DICTIONARIES
  // ==========================================
  const hasDescIntent = INTENT_SORT_DESC.some((w) => containsPhrase(query, w));
  const hasAscIntent = INTENT_SORT_ASC.some((w) => containsPhrase(query, w));
  const hasTrendIntent = INTENT_TREND.some((w) => containsPhrase(query, w));
  const hasDonutIntent = ['donut', 'pie', 'proportion', 'share', 'distribution', 'percentage', 'split'].some((w) =>
    containsPhrase(query, w)
  );

  // ==========================================
  // EXTRACT VARIABLES (Scan Dataset Schema)
  // ==========================================
  const { semanticInfo, headers } = context;

  // Build list of candidate metrics
  const candidateMetrics: { key: string; score: number }[] = [];
  const allMetricKeys = Array.from(new Set([...semanticInfo.financialNumeric, 'volume']));

  for (const metricKey of allMetricKeys) {
    const score = scoreColumnMatch(query, metricKey, true);
    if (score > 0) {
      candidateMetrics.push({ key: metricKey, score });
    }
  }

  // Build list of candidate dimensions
  const candidateDimensions: { key: string; score: number }[] = [];
  const allDimensionKeys = Array.from(
    new Set([
      ...semanticInfo.categorical.map((c) => c.key),
      ...semanticInfo.temporal,
      ...semanticInfo.identifiers,
    ])
  );

  for (const dimKey of allDimensionKeys) {
    const score = scoreColumnMatch(query, dimKey, false);
    if (score > 0) {
      candidateDimensions.push({ key: dimKey, score });
    }
  }

  // Sort candidates by match score
  candidateMetrics.sort((a, b) => b.score - a.score);
  candidateDimensions.sort((a, b) => b.score - a.score);

  // Check 2: Complexity Firewall - more than 2 conflicting metrics or dimensions detected
  if (candidateMetrics.length > 2 || candidateDimensions.length > 2) {
    return {
      success: false,
      error: COMPLEX_QUERY_FALLBACK_MESSAGE,
    };
  }

  // ==========================================
  // C. PARTIAL MATCHING & SMART DEFAULTS
  // ==========================================
  let selectedDimension: string | null = null;
  let selectedMetric: string | null = null;
  let sortDirection: 'desc' | 'asc' | 'chronological' = 'desc';
  let chartType: 'bar' | 'horizontal-bar' | 'line' | 'donut' = 'bar';

  // 1. Determine Dimension & Metric with Smart Defaults
  if (candidateDimensions.length > 0 && candidateMetrics.length > 0) {
    // Both Found
    selectedDimension = candidateDimensions[0].key;
    selectedMetric = candidateMetrics[0].key;
  } else if (candidateDimensions.length > 0 && candidateMetrics.length === 0) {
    // Only Dimension Found -> Auto-pair with the Primary Financial Metric
    selectedDimension = candidateDimensions[0].key;
    selectedMetric = semanticInfo.primaryMetric || semanticInfo.financialNumeric[0] || 'volume';
  } else if (candidateMetrics.length > 0 && candidateDimensions.length === 0) {
    // Only Metric Found -> Auto-pair with the highest-cardinality Categorical Dimension
    selectedMetric = candidateMetrics[0].key;
    if (semanticInfo.categorical.length > 0) {
      // Find highest cardinality categorical dimension
      const sortedByCard = [...semanticInfo.categorical].sort((a, b) => b.cardinality - a.cardinality);
      selectedDimension = sortedByCard[0].key;
    } else {
      selectedDimension = semanticInfo.primaryDimension || allDimensionKeys[0];
    }
  } else {
    // No specific dimension or metric named explicitly in query.
    // Check if Intent was found (e.g. "most expensive", "top", "trend", "cheapest")
    if (hasTrendIntent) {
      // Trend intent without named variables
      if (semanticInfo.temporal.length > 0) {
        selectedDimension = semanticInfo.temporal[0];
      } else {
        selectedDimension = semanticInfo.primaryDimension;
      }
      selectedMetric = semanticInfo.primaryMetric || 'volume';
    } else if (hasDescIntent || hasAscIntent) {
      // Intent found with default dimension & metric
      selectedDimension = semanticInfo.primaryDimension || allDimensionKeys[0];
      selectedMetric = semanticInfo.primaryMetric || semanticInfo.financialNumeric[0] || 'volume';
    } else {
      // Query does not match any recognized intent, dimension, or metric
      return {
        success: false,
        error: COMPLEX_QUERY_FALLBACK_MESSAGE,
      };
    }
  }

  // Safety fallback if somehow still null
  if (!selectedDimension) {
    selectedDimension = semanticInfo.primaryDimension || allDimensionKeys[0] || headers[0];
  }
  if (!selectedMetric) {
    selectedMetric = semanticInfo.primaryMetric || semanticInfo.financialNumeric[0] || 'volume';
  }

  // ==========================================
  // SORT DIRECTION DETERMINATION
  // ==========================================
  const isTemporal = semanticInfo.temporal.includes(selectedDimension);

  if (hasTrendIntent || (isTemporal && !hasDescIntent && !hasAscIntent)) {
    sortDirection = 'chronological';
  } else if (hasAscIntent) {
    sortDirection = 'asc';
  } else {
    sortDirection = 'desc';
  }

  // ==========================================
  // INTELLIGENT CHART ROUTING
  // ==========================================
  if (isTemporal || hasTrendIntent) {
    chartType = 'line';
  } else if (hasDonutIntent) {
    chartType = 'donut';
  } else {
    // Check cardinality of the selected dimension
    const catMeta = semanticInfo.categorical.find((c) => c.key === selectedDimension);
    if (catMeta && catMeta.cardinality <= 5 && catMeta.cardinality >= 2 && !hasDescIntent && !hasAscIntent) {
      chartType = 'donut';
    } else if (catMeta && catMeta.cardinality > 6) {
      chartType = 'horizontal-bar';
    } else {
      chartType = 'bar';
    }
  }

  return {
    success: true,
    dimension: selectedDimension,
    metric: selectedMetric,
    chartType,
    sortDirection,
    explanation: `Showing ${selectedMetric} by ${selectedDimension} (${
      sortDirection === 'asc' ? 'Ascending' : sortDirection === 'desc' ? 'Descending' : 'Chronological'
    })`,
  };
}
