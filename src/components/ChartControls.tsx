import {
  BarChart2,
  TrendingUp,
  PieChart as PieIcon,
  Layers,
  Filter,
  Search,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  Calendar,
  DollarSign,
  Activity,
  CircleDot,
  AlignLeft,
} from 'lucide-react';
import { ChartType, DimensionType, MetricType, DashboardFilters } from '../types';

interface ChartControlsProps {
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  dimension: DimensionType;
  onDimensionChange: (dim: DimensionType) => void;
  metric: MetricType;
  onMetricChange: (metric: MetricType) => void;
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  onResetFilters: () => void;
  availableProducts: string[];
  availablePaymentMethods: string[];
  dimensionOptions?: { key: string; label: string }[];
  metricOptions?: { key: string; label: string }[];
  activeFilterCount: number;
  showLabels: boolean;
  onToggleLabels: () => void;
}

const CHART_TYPE_OPTIONS: {
  value: ChartType;
  label: string;
  category: string;
}[] = [
  { value: 'bar', label: 'Bar Chart (Vertical)', category: 'Comparison' },
  { value: 'horizontal-bar', label: 'Horizontal Bar Chart', category: 'Comparison' },
  { value: 'stacked-bar', label: 'Stacked Bar Chart', category: 'Comparison' },
  { value: 'line', label: 'Line Graph (Timeline)', category: 'Trends' },
  { value: 'area', label: 'Area Chart (Volume)', category: 'Trends' },
  { value: 'pie', label: 'Pie Chart', category: 'Composition' },
  { value: 'donut', label: 'Donut Chart', category: 'Composition' },
  { value: 'radar', label: 'Radar Chart', category: 'Multi-Metric' },
  { value: 'scatter', label: 'Scatter Plot', category: 'Distribution' },
];

export function ChartControls({
  chartType,
  onChartTypeChange,
  dimension,
  onDimensionChange,
  metric,
  onMetricChange,
  filters,
  onFiltersChange,
  onResetFilters,
  availableProducts,
  availablePaymentMethods,
  dimensionOptions,
  metricOptions,
  activeFilterCount,
  showLabels,
  onToggleLabels,
}: ChartControlsProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs mb-6 transition-colors">
      {/* Primary Configuration Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        
        {/* Chart Type Dropdown & Metric Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Chart Type Dropdown */}
          <div className="flex flex-col gap-1">
            <label htmlFor="chart-type-select" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Chart Type</span>
            </label>
            <div className="relative inline-block">
              <select
                id="chart-type-select"
                value={chartType}
                onChange={(e) => onChartTypeChange(e.target.value as ChartType)}
                className="w-56 appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-900 dark:text-white text-sm font-medium rounded-lg px-3 py-2 pr-8 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors cursor-pointer"
              >
                <optgroup label="Comparison" className="dark:bg-slate-900 dark:text-white">
                  <option value="bar">📊 Bar Chart (Vertical)</option>
                  <option value="horizontal-bar">📋 Horizontal Bar Chart</option>
                  <option value="stacked-bar">🧱 Stacked Bar (Payment Segment)</option>
                </optgroup>
                <optgroup label="Trends over Time" className="dark:bg-slate-900 dark:text-white">
                  <option value="line">📈 Line Graph</option>
                  <option value="area">🌊 Area Chart</option>
                </optgroup>
                <optgroup label="Composition & Share" className="dark:bg-slate-900 dark:text-white">
                  <option value="pie">🥧 Pie Chart</option>
                  <option value="donut">🍩 Donut Chart</option>
                </optgroup>
                <optgroup label="Advanced Analytics" className="dark:bg-slate-900 dark:text-white">
                  <option value="radar">🕸️ Radar Chart</option>
                  <option value="scatter">⚪ Scatter Plot (Price vs Units)</option>
                </optgroup>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
                <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Group By (Dimension) Dropdown */}
          <div className="flex flex-col gap-1">
            <label htmlFor="dimension-select" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Group By</span>
            </label>
            <div className="relative inline-block">
              <select
                id="dimension-select"
                value={dimension}
                onChange={(e) => onDimensionChange(e.target.value)}
                className="w-48 appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-900 dark:text-white text-sm font-medium rounded-lg px-3 py-2 pr-8 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors cursor-pointer"
              >
                {dimensionOptions && dimensionOptions.length > 0 ? (
                  dimensionOptions.map((opt) => (
                    <option key={opt.key} value={opt.key} className="dark:bg-slate-900 dark:text-white">
                      {opt.label}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="product" className="dark:bg-slate-900 dark:text-white">Product Name</option>
                    <option value="paymentMethod" className="dark:bg-slate-900 dark:text-white">Payment Method</option>
                    <option value="date" className="dark:bg-slate-900 dark:text-white">Date (Timeline)</option>
                  </>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
                <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Metric Selector Buttons / Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Primary Metric</span>
            </label>
            {metricOptions && metricOptions.length > 0 ? (
              <div className="relative inline-block">
                <select
                  value={metric}
                  onChange={(e) => onMetricChange(e.target.value)}
                  className="w-48 appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-900 dark:text-white text-sm font-medium rounded-lg px-3 py-2 pr-8 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors cursor-pointer"
                >
                  {metricOptions.map((opt) => (
                    <option key={opt.key} value={opt.key} className="dark:bg-slate-900 dark:text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
                  <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => onMetricChange('revenue')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    metric === 'revenue'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Revenue ($)
                </button>
                <button
                  type="button"
                  onClick={() => onMetricChange('volume')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    metric === 'volume'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Units Sold
                </button>
                <button
                  type="button"
                  onClick={() => onMetricChange('avgPrice')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    metric === 'avgPrice'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Avg Price
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Auxiliary Display Options */}
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={onToggleLabels}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              showLabels
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>{showLabels ? 'Hide Data Values' : 'Show Data Values'}</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="pt-3.5 flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order #, product, date..."
            value={filters.searchQuery}
            onChange={(e) =>
              onFiltersChange({ ...filters, searchQuery: e.target.value })
            }
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
          />
        </div>

        {/* Product Filter Dropdown */}
        <div className="min-w-[170px]">
          <select
            value={filters.selectedProduct}
            onChange={(e) =>
              onFiltersChange({ ...filters, selectedProduct: e.target.value })
            }
            aria-label="Filter by Product"
            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="All" className="dark:bg-slate-900">All Products ({availableProducts.length})</option>
            {availableProducts.map((p) => (
              <option key={p} value={p} className="dark:bg-slate-900">
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method Filter Dropdown */}
        <div className="min-w-[150px]">
          <select
            value={filters.selectedPaymentMethod}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                selectedPaymentMethod: e.target.value,
              })
            }
            aria-label="Filter by Payment Method"
            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="All" className="dark:bg-slate-900">All Payment Methods</option>
            {availablePaymentMethods.map((m) => (
              <option key={m} value={m} className="dark:bg-slate-900">
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter Inputs */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              onFiltersChange({ ...filters, startDate: e.target.value })
            }
            title="Start date"
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-slate-400 dark:text-slate-500">to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              onFiltersChange({ ...filters, endDate: e.target.value })
            }
            title="End date"
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Reset Filter Button */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset ({activeFilterCount})</span>
          </button>
        )}
      </div>
    </div>
  );
}
