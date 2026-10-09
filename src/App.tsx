import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import Papa from 'papaparse';
import {
  BarChart2,
  AlignLeft,
  TrendingUp,
  PieChart as PieIcon,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  SalesRecord,
  DimensionType,
  MetricType,
  DataProfileMetrics,
  DatasetSchema,
  DataHealthScanResult,
  KpiConfigItem,
  PreFlightRemediationMode,
} from './types';
import {
  scanDataHealth,
  applyHealthSettings,
  repairMatrixWithRecommendedFixes,
  repairMatrixWithOptions,
} from './utils/dataHealthEngine';
import { profileDataset } from './utils/dataProfiler';
import { inferDatasetSchema } from './utils/schemaEngine';
import {
  classifyColumns,
  aggregateDimensionMetrics,
  formatIntlNumber,
  SemanticClassification,
} from './utils/semanticAnalyzer';
import { generateJumiaKongaSales } from './data/nigerianDatasets';
import { objectsToMatrix } from './utils/fileNormalizationEngine';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { KpiCards } from './components/KpiCards';
import { ChartJsVisualizer } from './components/ChartJsVisualizer';
import { KeyTakeawaysCard } from './components/KeyTakeawaysCard';
import { QuestionBox } from './components/QuestionBox';
import { TransactionHistoryTable } from './components/TransactionHistoryTable';
import { PresentationModal } from './components/PresentationModal';
import { DataHealthModal } from './components/DataHealthModal';
import { Analytics } from '@vercel/analytics/react';

// Initialize default dataset using Nigerian Dataset A: Jumia/Konga Sales
const INITIAL_DEFAULT_RECORDS: SalesRecord[] = generateJumiaKongaSales().map((r, i) => {
  const obj: any = { ...r };
  Object.defineProperty(obj, 'id', { value: `REC-${i + 1}`, enumerable: false, writable: true });
  Object.defineProperty(obj, 'orderNumber', { value: `ORD-${1000 + i + 1}`, enumerable: false, writable: true });
  Object.defineProperty(obj, 'product', { value: r['Item'] || '', enumerable: false, writable: true });
  Object.defineProperty(obj, 'price', { value: r['Revenue (NGN)'] || r['Revenue NGN'] || 0, enumerable: false, writable: true });
  Object.defineProperty(obj, 'date', { value: r['Order Date'] || '', enumerable: false, writable: true });
  Object.defineProperty(obj, 'paymentMethod', { value: r['Payment'] || 'Card', enumerable: false, writable: true });
  return obj;
});
const INITIAL_MATRIX_DATA = objectsToMatrix(INITIAL_DEFAULT_RECORDS);

interface StoredDashboardSession {
  records: SalesRecord[];
  datasetName: string;
  currentHeaders: string[];
  dimension: DimensionType;
  metric: MetricType;
  chartType: 'bar' | 'horizontal-bar' | 'line' | 'donut';
  sortDirection: 'desc' | 'asc' | 'chronological';
}

function getStoredDashboardSession(): StoredDashboardSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('vizr_saved_dashboard');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0 && parsed.datasetName) {
      return parsed as StoredDashboardSession;
    }
  } catch {
    return null;
  }
  return null;
}

// Global State Memory: Initialize baseline state variables on module load
const INITIAL_BASELINE_SEMANTIC = classifyColumns(INITIAL_MATRIX_DATA.headers, INITIAL_DEFAULT_RECORDS);
if (typeof window !== 'undefined') {
  window.activeDataset = [...INITIAL_DEFAULT_RECORDS];
  window.activeFileName = 'Jumia & Konga E-Commerce Sales';
  window.defaultDimension = INITIAL_BASELINE_SEMANTIC.primaryDimension;
  window.defaultMetric = INITIAL_BASELINE_SEMANTIC.primaryMetric;
  window.defaultChartType = INITIAL_BASELINE_SEMANTIC.recommendedChartType;
}

export default function App() {
  const initialSavedSession = useMemo(() => getStoredDashboardSession(), []);

  const [records, setRecords] = useState<SalesRecord[]>(() => {
    return initialSavedSession ? initialSavedSession.records : INITIAL_DEFAULT_RECORDS;
  });
  const [datasetName, setDatasetName] = useState<string>(() => {
    return initialSavedSession ? initialSavedSession.datasetName : 'Jumia & Konga E-Commerce Sales';
  });
  const [currentHeaders, setCurrentHeaders] = useState<string[]>(() => {
    return initialSavedSession ? initialSavedSession.currentHeaders : INITIAL_MATRIX_DATA.headers;
  });
  const [renderKey, setRenderKey] = useState<number>(0);

  // Schema state
  const [currentSchema, setCurrentSchema] = useState<DatasetSchema>(() => {
    if (initialSavedSession) {
      const matrixData = objectsToMatrix(initialSavedSession.records);
      return inferDatasetSchema(
        initialSavedSession.currentHeaders,
        matrixData.matrix.slice(1),
        initialSavedSession.datasetName
      );
    }
    return inferDatasetSchema(INITIAL_MATRIX_DATA.headers, INITIAL_MATRIX_DATA.matrix.slice(1), 'Jumia & Konga E-Commerce Sales');
  });

  // A. Semantic Column Classification
  const semanticInfo: SemanticClassification = useMemo(() => {
    return classifyColumns(currentHeaders, records);
  }, [currentHeaders, records]);

  // Selected Dimension & Metric
  const [dimension, setDimension] = useState<DimensionType>(() => {
    return initialSavedSession ? initialSavedSession.dimension : semanticInfo.primaryDimension;
  });
  const [metric, setMetric] = useState<MetricType>(() => {
    return initialSavedSession ? initialSavedSession.metric : semanticInfo.primaryMetric;
  });
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc' | 'chronological'>(() => {
    return initialSavedSession ? initialSavedSession.sortDirection : 'desc';
  });

  // C. Chart Routing: default based on semantic heuristics
  const [chartType, setChartType] = useState<'bar' | 'horizontal-bar' | 'line' | 'donut'>(() => {
    return initialSavedSession ? initialSavedSession.chartType : semanticInfo.recommendedChartType;
  });

  // Progressive disclosure: Raw data table hidden by default
  const [showDataTable, setShowDataTable] = useState<boolean>(false);

  // Profiling state
  const [profileMetrics, setProfileMetrics] = useState<DataProfileMetrics>(() => {
    const targetRecords = initialSavedSession ? initialSavedSession.records : INITIAL_DEFAULT_RECORDS;
    return profileDataset(targetRecords, targetRecords.length, 0);
  });

  // Presentation modal state
  const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false);

  // Pre-Flight Health Check Interceptor state
  const [pendingDataset, setPendingDataset] = useState<{
    matrix: string[][];
    sourceName: string;
    scanResult: DataHealthScanResult;
  } | null>(null);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-mode');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Display the Dashboard if restored session exists (e.g. background tab reload / inactive resume), otherwise Landing Page
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard'>(() => {
    const isDash = !!initialSavedSession;
    if (typeof document !== 'undefined') {
      if (isDash) {
        document.documentElement.classList.add('dashboard-active');
        document.body.classList.add('dashboard-active');
        document.documentElement.classList.remove('landing-active');
        document.body.classList.remove('landing-active');
      } else {
        document.documentElement.classList.add('landing-active');
        document.body.classList.add('landing-active');
        document.documentElement.classList.remove('dashboard-active');
        document.body.classList.remove('dashboard-active');
      }
    }
    return isDash ? 'dashboard' : 'landing';
  });

  // Seamless, zero-lag view mode switcher that synchronously applies document zoom classes
  // BEFORE any DOM repaint occurs, preventing any scaling glitch or delay
  const applyViewMode = (mode: 'landing' | 'dashboard') => {
    if (typeof document !== 'undefined') {
      if (mode === 'landing') {
        document.documentElement.classList.remove('dashboard-active');
        document.body.classList.remove('dashboard-active');
        document.documentElement.classList.add('landing-active');
        document.body.classList.add('landing-active');
      } else {
        document.documentElement.classList.remove('landing-active');
        document.body.classList.remove('landing-active');
        document.documentElement.classList.add('dashboard-active');
        document.body.classList.add('dashboard-active');
      }
    }
    setViewMode(mode);
  };

  // Persist current dashboard session to sessionStorage so returning to the app or background tab reload restores it
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (viewMode === 'dashboard' && records && records.length > 0) {
      try {
        const sessionData: StoredDashboardSession = {
          records,
          datasetName,
          currentHeaders,
          dimension,
          metric,
          chartType,
          sortDirection,
        };
        sessionStorage.setItem('vizr_saved_dashboard', JSON.stringify(sessionData));
      } catch (err) {
        console.warn('Could not cache dashboard session:', err);
      }
    }
  }, [viewMode, records, datasetName, currentHeaders, dimension, metric, chartType, sortDirection]);

  // Resumption handler: if user was away / inactive and clicks back into the web app,
  // ensure the active dashboard is preserved and restored if not already displayed
  useEffect(() => {
    const handleResume = () => {
      try {
        const raw = sessionStorage.getItem('vizr_saved_dashboard');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0) {
            setRecords(parsed.records);
            setDatasetName(parsed.datasetName);
            if (parsed.currentHeaders) setCurrentHeaders(parsed.currentHeaders);
            if (parsed.dimension) setDimension(parsed.dimension);
            if (parsed.metric) setMetric(parsed.metric);
            if (parsed.chartType) setChartType(parsed.chartType);
            if (parsed.sortDirection) setSortDirection(parsed.sortDirection);
            applyViewMode('dashboard');
          }
        }
      } catch {
        // Safe fallback
      }
    };

    window.addEventListener('focus', handleResume);
    window.addEventListener('pageshow', handleResume);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleResume();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('pageshow', handleResume);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Keep window global state in sync for chart resets and downloads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.activeDataset = [...records];
      window.activeFileName = datasetName;
      window.defaultDimension = dimension;
      window.defaultMetric = metric;
      window.defaultChartType = chartType;
    }
  }, [records, datasetName, dimension, metric, chartType]);

  // Synchronize document zoom classes with useLayoutEffect BEFORE paint:
  // Landing scaled down by 25% (0.75), Dashboard scaled down by 15% (0.85)
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    if (viewMode === 'landing') {
      document.documentElement.classList.add('landing-active');
      document.body.classList.add('landing-active');
      document.documentElement.classList.remove('dashboard-active');
      document.body.classList.remove('dashboard-active');
    } else {
      document.documentElement.classList.add('dashboard-active');
      document.body.classList.add('dashboard-active');
      document.documentElement.classList.remove('landing-active');
      document.body.classList.remove('landing-active');
    }
  }, [viewMode]);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme-mode', theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      try {
        localStorage.setItem('theme-mode', nextTheme);
      } catch {
        // Ignore
      }
      return nextTheme;
    });
  };

  // Sync dimension/metric only when a brand new dataset is loaded
  const prevDatasetNameRef = useRef<string>(datasetName);
  useEffect(() => {
    if (prevDatasetNameRef.current !== datasetName) {
      prevDatasetNameRef.current = datasetName;
      if (semanticInfo) {
        setDimension(semanticInfo.primaryDimension);
        setMetric(semanticInfo.primaryMetric);
        setChartType(semanticInfo.recommendedChartType);
        setSortDirection('desc');
      }
    }
  }, [datasetName, semanticInfo]);

  // Main Render Function executing exact pipeline
  const renderDashboard = (
    targetDim?: string,
    targetMet?: string,
    targetChart?: 'bar' | 'horizontal-bar' | 'line' | 'donut',
    targetSort?: 'desc' | 'asc' | 'chronological'
  ) => {
    // Chart.js Safety: Destroy existing Chart instance before drawing new chart
    if (typeof window !== 'undefined' && window.activeChartInstance) {
      try {
        window.activeChartInstance.destroy();
      } catch (err) {
        console.warn('Error destroying chart instance:', err);
      }
      window.activeChartInstance = null;
    }

    const d =
      targetDim || (typeof window !== 'undefined' && window.defaultDimension) || semanticInfo.primaryDimension;
    const m =
      targetMet || (typeof window !== 'undefined' && window.defaultMetric) || semanticInfo.primaryMetric;
    const c =
      targetChart || (typeof window !== 'undefined' && window.defaultChartType) || semanticInfo.recommendedChartType;
    const s = targetSort || 'desc';

    setDimension(d);
    setMetric(m);
    setChartType(c);
    setSortDirection(s);
    setRenderKey((prev) => prev + 1);
  };

  // The Reversion Logic & Chart.js Lifecycle:
  const resetDashboard = () => {
    // 2. Guard Clause for the Clear Button:
    // If no dataset is currently active, clicking "Clear" should do absolutely nothing.
    if (typeof window === 'undefined' || !window.activeDataset || window.activeDataset.length === 0) {
      return;
    }

    // Destroy existing Chart.js instance (to prevent ghosting)
    if (window.activeChartInstance) {
      try {
        window.activeChartInstance.destroy();
      } catch (err) {
        console.warn('Error destroying chart instance:', err);
      }
      window.activeChartInstance = null;
    }

    // Call your main render function explicitly passing in window.defaultDimension and window.defaultMetric
    renderDashboard(window.defaultDimension, window.defaultMetric, window.defaultChartType);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.resetDashboard = resetDashboard;
      window.renderDashboard = renderDashboard;
      window.renderChart = (chart, dim, met) => {
        if (!chart && !dim && !met && typeof (window as any).visualizerRenderChart === 'function') {
          (window as any).visualizerRenderChart();
          return;
        }
        renderDashboard(dim, met, chart as any);
      };
      window.handleFileUpload = handleFileUpload;
    }
  });

  // B. Intelligent Aggregation & Math Safety
  // Groups by single dimension, sums metrics safely (null/blank as 0), and applies sorting
  const aggregatedData = useMemo(() => {
    const isTemporal = semanticInfo.temporal.includes(dimension);
    const effectiveSort = isTemporal && chartType === 'line' ? 'chronological' : sortDirection;
    return aggregateDimensionMetrics(
      records,
      dimension,
      metric,
      isTemporal,
      semanticInfo.currencySymbol,
      effectiveSort
    );
  }, [records, dimension, metric, chartType, sortDirection, semanticInfo]);

  // Dynamic dimension options with cardinality badges
  const dimensionOptions = useMemo(() => {
    const items: { key: string; label: string; badge?: string }[] = [];

    // Categorical dimensions (with cardinality)
    semanticInfo.categorical.forEach((c) => {
      items.push({
        key: c.key,
        label: `${c.label} (${c.cardinality} categories)`,
        badge: `${c.cardinality}`,
      });
    });

    // Temporal dimensions
    semanticInfo.temporal.forEach((t) => {
      items.push({
        key: t,
        label: `${t} (Timeline)`,
      });
    });

    // Identifiers (forced as strings, NEVER summed)
    semanticInfo.identifiers.forEach((idCol) => {
      items.push({
        key: idCol,
        label: `${idCol} (ID / Key)`,
      });
    });

    return items;
  }, [semanticInfo]);

  // Dynamic metric options (true mathematical numbers + record count)
  const metricOptions = useMemo(() => {
    const items: { key: string; label: string }[] = [];

    semanticInfo.financialNumeric.forEach((fn) => {
      items.push({
        key: fn,
        label: `${fn} (${semanticInfo.currencySymbol})`,
      });
    });

    items.push({ key: 'volume', label: 'Record Count (Volume)' });
    return items;
  }, [semanticInfo]);

  // D. Number Formatting & KPIs
  const isCurrency =
    metric.toLowerCase().includes('revenue') ||
    metric.toLowerCase().includes('price') ||
    metric.toLowerCase().includes('cost') ||
    metric.toLowerCase().includes('salary') ||
    metric.toLowerCase().includes('fees') ||
    metric.toLowerCase().includes('spend') ||
    metric.toLowerCase().includes('budget') ||
    metric.toLowerCase().includes('ngn') ||
    metric.toLowerCase().includes('amount') ||
    metric.includes('$') ||
    metric.includes('₦') ||
    metric.includes('($)') ||
    metric.includes('(₦)');

  const dynamicKpis: KpiConfigItem[] = useMemo(() => {
    const totalMetricSum = aggregatedData.reduce((acc, p) => acc + p.value, 0);
    const totalCount = records.length;
    const avgPerRecord = totalCount > 0 ? totalMetricSum / totalCount : 0;
    const topPerformer = aggregatedData[0];

    return [
      {
        title: `Total ${metric}`,
        value: formatIntlNumber(totalMetricSum, {
          isCurrency,
          currencySymbol: semanticInfo.currencySymbol,
          maxDecimals: 0,
        }),
        subtext: `Aggregated across ${totalCount} records`,
        iconType: 'dollar',
        iconColor: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      },
      {
        title: `Average per Record`,
        value: formatIntlNumber(avgPerRecord, {
          isCurrency,
          currencySymbol: semanticInfo.currencySymbol,
          maxDecimals: 2,
        }),
        subtext: `Mean ${metric} distribution`,
        iconType: 'activity',
        iconColor: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      },
      {
        title: `Top ${dimension}`,
        value: topPerformer ? topPerformer.name : 'None',
        subtext: topPerformer
          ? `${topPerformer.formattedValue} (${topPerformer.percentage}% share)`
          : 'No data',
        iconType: 'award',
        iconColor: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      },
      {
        title: 'Active Segments',
        value: formatIntlNumber(aggregatedData.length),
        subtext: `Distinct ${dimension} entries`,
        iconType: 'layers',
        iconColor: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      },
    ];
  }, [aggregatedData, metric, dimension, records.length, isCurrency, semanticInfo.currencySymbol]);

  // C. Chart Routing Heuristics:
  const handleSelectChartType = (targetType: 'bar' | 'horizontal-bar' | 'line' | 'donut') => {
    // 1. Line Chart (Trend): ONLY draw if a Temporal column exists.
    // If no temporal column exists, default to a Horizontal Bar Chart.
    if (targetType === 'line') {
      if (semanticInfo.temporal.length > 0) {
        setChartType('line');
        // Ensure temporal column is set as dimension
        if (!semanticInfo.temporal.includes(dimension)) {
          setDimension(semanticInfo.temporal[0]);
        }
      } else {
        // Default to Horizontal Bar Chart
        setChartType('horizontal-bar');
      }
      return;
    }

    // 2. Doughnut Chart (Proportion): ONLY use for Categorical columns with low cardinality (<= 5).
    if (targetType === 'donut') {
      const currentCat = semanticInfo.categorical.find((c) => c.key === dimension);
      if (currentCat && currentCat.cardinality <= 5) {
        setChartType('donut');
      } else {
        // Find a low cardinality categorical dimension if available
        const lowCard = semanticInfo.categorical.find((c) => c.cardinality <= 5 && c.cardinality >= 2);
        if (lowCard) {
          setDimension(lowCard.key);
          setChartType('donut');
        } else {
          setChartType('donut');
        }
      }
      return;
    }

    // 3. Vertical Bar Chart (Comparison):
    if (targetType === 'bar') {
      setChartType('bar');
      return;
    }

    // Horizontal Bar:
    setChartType('horizontal-bar');
  };

  // Commit and render clean dataset into dashboard
  const commitCleanDataset = (
    matrix: string[][],
    sourceName: string,
    scanResult: DataHealthScanResult | null
  ) => {
    const settings = scanResult?.recommendedSettings || {
      headerRowIndex: 0,
      excludeSummaryRows: true,
      summaryRowIndexes: [],
      numericMissingTreatment: 'median' as const,
      categoricalBlankTreatment: 'unspecified' as const,
    };

    const { records: cleanRecords, excludedCount } = applyHealthSettings(
      matrix,
      settings,
      sourceName
    );

    // AGGRESSIVE STATE MANAGEMENT:
    // Overwrite the single global variable window.activeDataset = cleanRecords. Never append or merge.
    if (typeof window !== 'undefined') {
      window.activeDataset = [...cleanRecords];
      window.activeFileName = sourceName;
    }

    const headers = matrix[settings.headerRowIndex] || matrix[0] || [];
    const dataRows = matrix.slice(settings.headerRowIndex + 1);
    const schema = inferDatasetSchema(headers, dataRows, sourceName);

    setCurrentHeaders(headers);
    setCurrentSchema(schema);

    // CRITICAL: Inside handleFileUpload / commitCleanDataset, immediately after the SemanticAnalyzer identifies
    // the best initial columns, you MUST overwrite these variables with the new file's defaults.
    const initialSemantic = classifyColumns(headers, cleanRecords);
    if (typeof window !== 'undefined') {
      window.defaultDimension = initialSemantic.primaryDimension;
      window.defaultMetric = initialSemantic.primaryMetric;
      window.defaultChartType = initialSemantic.recommendedChartType;
    }

    const metrics = profileDataset(cleanRecords, matrix.length, excludedCount);
    prevDatasetNameRef.current = sourceName;
    setRecords(cleanRecords);
    setDatasetName(sourceName);
    setProfileMetrics(metrics);
    setShowDataTable(false);
    applyViewMode('dashboard');

    // Trigger main render pipeline explicitly passing in baseline dimension and metric
    renderDashboard(
      initialSemantic.primaryDimension,
      initialSemantic.primaryMetric,
      initialSemantic.recommendedChartType
    );
  };

  // Explicit handleFileUpload function mapping to matrix loader
  const handleFileUpload = (matrix: string[][], sourceName: string) => {
    handleLoadMatrix(matrix, sourceName);
  };

  // Pre-Flight Health Check Interceptor: After data parsing (upload or sample)
  // Fast, instant evaluation without artificial delays or stutter
  const handleLoadMatrix = (matrix: string[][], sourceName: string) => {
    // AGGRESSIVE STATE MANAGEMENT: Completely clear and overwrite window.activeDataset = []
    if (typeof window !== 'undefined') {
      window.activeDataset = [];
    }

    try {
      const scanResult = scanDataHealth(matrix);

      const hasOmniNulls = (scanResult.omniNullRows?.length ?? 0) > 0;
      const hasSummaryRows = scanResult.summaryRows.length > 0;

      // Trigger "Data Issues" modal if any Omni-Null or Summary Rows are found
      if (hasOmniNulls || hasSummaryRows) {
        setPendingDataset({ matrix, sourceName, scanResult });
        setIsHealthModalOpen(true);
        return;
      }

      // If clean, proceed directly to generate dashboard
      commitCleanDataset(matrix, sourceName, scanResult);
    } catch {
      // Fallback
      commitCleanDataset(matrix, sourceName, null);
    }
  };

  // Remediation handler for Pre-Flight scan: 'median' | 'remove_rows' | 'ignore'
  const handleApplyFix = (mode: PreFlightRemediationMode = 'median') => {
    if (!pendingDataset) return;
    if (typeof window !== 'undefined') {
      window.activeDataset = [];
    }
    const { matrix, sourceName, scanResult } = pendingDataset;
    const { cleanMatrix } = repairMatrixWithOptions(matrix, scanResult, mode);
    setIsHealthModalOpen(false);
    setPendingDataset(null);
    commitCleanDataset(cleanMatrix, sourceName, scanResult);
  };

  const handleApplyRecommendedFixes = () => handleApplyFix('median');

  // 1:1 Raw Data Export Fidelity using Papa.unparse
  const handleExportCSV = () => {
    const exportData =
      typeof window !== 'undefined' && window.activeDataset && window.activeDataset.length > 0
        ? window.activeDataset
        : records;

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${datasetName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_raw_data.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. The Landing View (shown when "Upload New" is explicitly clicked, scaled down by 25%)
  if (viewMode === 'landing') {
    return (
      <div className="landing-container min-h-screen min-h-[100dvh] flex-1 flex flex-col w-full transition-colors duration-250 ease-out">
        <LandingPage
          onLoadMatrix={handleLoadMatrix}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
        <DataHealthModal
          isOpen={isHealthModalOpen}
          scanResult={pendingDataset?.scanResult ?? null}
          datasetName={pendingDataset?.sourceName ?? ''}
          onApplyFix={handleApplyFix}
          onApplyRecommendedFixes={() => handleApplyFix('median')}
          onRemoveRowsWithNulls={() => handleApplyFix('remove_rows')}
          onIgnore={() => handleApplyFix('ignore')}
          onCancel={() => {
            setIsHealthModalOpen(false);
            setPendingDataset(null);
          }}
        />
      </div>
    );
  }

  // 2. The Dashboard View (displayed by default on launch, scaled down by 15%)
  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-100 dark:selection:bg-blue-900/60 selection:text-blue-900 transition-colors">
      {/* Sleek Minimal Header */}
      <Header
        datasetName={datasetName}
        totalRecords={records.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onExportCSV={handleExportCSV}
        onOpenPresentation={() => setIsPresentationModalOpen(true)}
        onGoToLanding={() => {
          try {
            sessionStorage.removeItem('vizr_saved_dashboard');
          } catch {
            // Ignore
          }
          applyViewMode('landing');
        }}
      />

      {/* Main Dashboard Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Row 1: High-Impact Monochromatic KPI Cards with Intl.NumberFormat */}
        <KpiCards dynamicKpis={dynamicKpis} />

        {/* Row 2: Interactive Chart.js Visualizer Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs transition-colors">
          {/* Chart Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            {/* Segmented Chart Type Selector with Heuristic Enforcements */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleSelectChartType('bar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Vertical Bar: Comparison across categories"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Bar</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectChartType('horizontal-bar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  chartType === 'horizontal-bar'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Horizontal Bar: Default ranking view"
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span>Horizontal</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectChartType('line')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  chartType === 'line'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={
                  semanticInfo.temporal.length > 0
                    ? `Line Chart: Trend over time (${semanticInfo.temporal.join(', ')})`
                    : 'Line Chart: Requires temporal date column (defaults to Horizontal Bar)'
                }
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Line</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectChartType('donut')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  chartType === 'donut'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Doughnut: Proportions for low-cardinality categories (<= 5 values)"
              >
                <PieIcon className="w-3.5 h-3.5" />
                <span>Donut</span>
              </button>
            </div>

            {/* Dimension & Metric Selectors */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Group by:</span>
                <select
                  value={dimension}
                  onChange={(e) => setDimension(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-700 cursor-pointer"
                >
                  {dimensionOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Metric:</span>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-700 cursor-pointer"
                >
                  {metricOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Chart Canvas: Rendered with Deep Blue (#1d4ed8) & No Gridlines */}
          <div className="pt-6">
            <ChartJsVisualizer
              key={`chart-${renderKey}-${dimension}-${metric}-${chartType}-${sortDirection}`}
              chartType={chartType}
              data={aggregatedData}
              metricLabel={metric}
              isCurrency={isCurrency}
              theme={theme}
            />
          </div>
        </div>

        {/* Row 3: Split-Panel UI (Question Box & Key Takeaways) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <QuestionBox
            headers={currentHeaders}
            semanticInfo={semanticInfo}
            records={records}
            currentDimension={dimension}
            currentMetric={metric}
            currentChartType={chartType}
            onApplyQuery={(res) => {
              if (res.dimension) setDimension(res.dimension);
              if (res.metric) setMetric(res.metric);
              if (res.chartType) setChartType(res.chartType);
              if (res.sortDirection) setSortDirection(res.sortDirection);
            }}
            onReset={resetDashboard}
          />
          <KeyTakeawaysCard
            aggregatedData={aggregatedData}
            dimensionName={dimension}
            metricName={metric}
            currencySymbol={semanticInfo.currencySymbol}
          />
        </div>

        {/* Row 4: Raw Data Table (Collapsible) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDataTable((prev) => !prev)}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer group"
            >
              <span>Raw Normalized Data ({records.length} records)</span>
              {showDataTable ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform" />
              )}
            </button>
          </div>

          {showDataTable && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <TransactionHistoryTable
                records={records}
                customColumns={currentHeaders}
                onExportCSV={handleExportCSV}
              />
            </div>
          )}
        </div>
      </main>

      {/* Presentation Deck Modal */}
      <PresentationModal
        isOpen={isPresentationModalOpen}
        onClose={() => setIsPresentationModalOpen(false)}
        datasetName={datasetName}
        dimension={dimension}
        metric={metric}
        chartType={chartType}
        aggregatedData={aggregatedData}
        records={records}
        currencySymbol={semanticInfo.currencySymbol}
        theme={theme}
      />

      {/* Pre-Flight Health Check Modal Interceptor */}
      <DataHealthModal
        isOpen={isHealthModalOpen}
        scanResult={pendingDataset?.scanResult ?? null}
        datasetName={pendingDataset?.sourceName ?? ''}
        onApplyFix={handleApplyFix}
        onApplyRecommendedFixes={() => handleApplyFix('median')}
        onRemoveRowsWithNulls={() => handleApplyFix('remove_rows')}
        onIgnore={() => handleApplyFix('ignore')}
        onCancel={() => {
          setIsHealthModalOpen(false);
          setPendingDataset(null);
        }}
      />
      <Analytics />
    </div>
  );
}
