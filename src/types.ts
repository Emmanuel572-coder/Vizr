export interface SalesRecord {
  id: string;
  orderNumber?: string;
  product?: string;
  price?: number;
  date?: string;
  paymentMethod?: string;
  [key: string]: any;
}

export type ChartType =
  | 'bar'
  | 'horizontal-bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'stacked-bar'
  | 'radar'
  | 'scatter';

export type DimensionType = string;
export type MetricType = string;

export interface ColumnMeta {
  key: string;
  label: string;
  type: 'numeric' | 'categorical' | 'date' | 'id';
  uniqueValuesCount: number;
  sampleValues: string[];
  isCurrency?: boolean;
  min?: number;
  max?: number;
  sum?: number;
  avg?: number;
  median?: number;
}

export interface KpiConfigItem {
  title: string;
  value: string;
  subtext: string;
  iconType: 'dollar' | 'activity' | 'award' | 'layers' | 'calendar' | 'credit-card' | 'shopping-bag';
  iconColor: string;
  bgColor: string;
  truncate?: boolean;
}

export interface DatasetSchema {
  columns: ColumnMeta[];
  primaryMetric: string;
  secondaryMetric?: string;
  primaryDimension: string;
  secondaryDimension?: string;
  dateColumn?: string;
  idColumn?: string;
  recommendedChartType: ChartType;
  domainCategory: string;
  kpis: KpiConfigItem[];
}

export interface DashboardFilters {
  searchQuery: string;
  selectedProduct: string;
  selectedPaymentMethod: string;
  startDate: string;
  endDate: string;
  minPrice: number;
  maxPrice: number;
  [key: string]: any;
}

export interface AggregatedDataPoint {
  name: string;
  revenue: number;
  volume: number;
  avgPrice: number;
  percentage?: number;
  [key: string]: any;
}

export type DataHealthIssueType =
  | 'DECORATIVE_HEADER'
  | 'SUMMARY_ROWS'
  | 'MISSING_NUMERIC'
  | 'BLANK_CATEGORICAL';

export interface DataHealthIssue {
  id: string;
  type: DataHealthIssueType;
  title: string;
  description: string;
  affectedCount: number;
  sampleRows?: number[];
  detectedIndex?: number;
  details?: string;
}

declare global {
  interface Window {
    activeDataset?: Record<string, any>[];
    activeFileName?: string;
    defaultDimension?: string;
    defaultMetric?: string;
    defaultChartType?: 'bar' | 'horizontal-bar' | 'line' | 'donut';
    activeChartInstance?: any;
    resetDashboard?: () => void;
    renderDashboard?: (
      targetDim?: string,
      targetMet?: string,
      targetChart?: 'bar' | 'horizontal-bar' | 'line' | 'donut'
    ) => void;
    renderChart?: (
      targetChart?: 'bar' | 'horizontal-bar' | 'line' | 'donut' | 'pie',
      targetDim?: string,
      targetMet?: string
    ) => void;
    handleFileUpload?: (matrix: string[][], sourceName: string) => void;
  }
}

export type PreFlightRemediationMode = 'median' | 'remove_rows' | 'ignore';

export interface DataHealthSettings {
  headerRowIndex: number;
  excludeSummaryRows: boolean;
  summaryRowIndexes: number[];
  numericMissingTreatment: 'exclude' | 'zero' | 'median' | 'drop' | 'keep';
  categoricalBlankTreatment: 'unspecified' | 'exclude';
}

export interface RawTableData {
  headers: string[];
  rows: (string | number | null | undefined)[][];
  sourceName: string;
}

export interface DataHealthScanResult {
  totalRawRows: number;
  totalColumns: number;
  headers: string[];
  suggestedHeaderIndex: number;
  hasDecorativeHeader: boolean;
  headerCandidates: { index: number; preview: string[]; score: number }[];
  summaryRows: { index: number; label: string; values: string[] }[];
  omniNullRows: number[];
  missingNumericRows: number[];
  medianPrice: number;
  blankCategoricalRows: number[];
  columnClassifications?: Record<number, 'numeric' | 'categorical'>;
  issues: DataHealthIssue[];
  initialHealthScore: number;
  recommendedSettings: DataHealthSettings;
}

export interface DataProfileMetrics {
  totalRecords: number;
  excludedRecords: number;
  retainedRecords: number;
  healthScore: number;
  totalRevenue: number;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  uniqueProductsCount: number;
  uniquePaymentMethodsCount: number;
  dateRange: {
    start: string;
    end: string;
    daysSpan: number;
  };
  topPerformers: {
    name: string;
    revenue: number;
    volume: number;
    sharePercent: number;
  }[];
  bottomPerformers: {
    name: string;
    revenue: number;
    volume: number;
    sharePercent: number;
  }[];
  timeTrend: {
    periodStart: string;
    periodEnd: string;
    startRevenue: number;
    endRevenue: number;
    growthRatePercent: number;
    peakDate: string;
    peakRevenue: number;
    avgDailyRevenue: number;
    trendDirection: 'up' | 'down' | 'flat';
  };
}

