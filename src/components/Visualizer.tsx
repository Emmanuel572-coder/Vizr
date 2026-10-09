import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { ChartType, DimensionType, MetricType, AggregatedDataPoint } from '../types';
import {
  formatCurrency,
  formatNumber,
  PRODUCT_PALETTE,
  PAYMENT_COLORS,
  getDistinctDonutColor,
} from '../utils/analytics';
import { Info, HelpCircle } from 'lucide-react';

interface VisualizerProps {
  chartType: ChartType;
  dimension: DimensionType;
  metric: MetricType;
  data: AggregatedDataPoint[];
  showLabels: boolean;
}

const PAYMENT_KEYS = ['Credit Card', 'Debit Card', 'eWallet', 'Cash'];

export function Visualizer({
  chartType,
  dimension,
  metric,
  data,
  showLabels,
}: VisualizerProps) {
  if (data.length === 0) {
    return (
      <div className="h-96 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center transition-colors">
        <Info className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No matching data found</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
          Adjust or clear your search filters to display visualizations for the sales transactions.
        </p>
      </div>
    );
  }

  const metricLabel =
    metric === 'revenue'
      ? 'Total Revenue'
      : metric === 'volume'
      ? 'Units Sold'
      : 'Average Price';

  const formatMetricValue = (val: number) => {
    if (metric === 'revenue' || metric === 'avgPrice') {
      return formatCurrency(val);
    }
    return formatNumber(val);
  };

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as AggregatedDataPoint;
      return (
        <div className="bg-slate-900 text-white rounded-lg shadow-xl p-3 text-xs border border-slate-800 z-50 max-w-xs">
          <p className="font-semibold text-slate-200 mb-1.5 border-b border-slate-700 pb-1">
            {point.displayName || point.name}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Total Revenue:</span>
              <span className="font-medium text-emerald-400">
                {formatCurrency(point.revenue)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Units Sold:</span>
              <span className="font-medium text-blue-400">
                {formatNumber(point.volume)} units
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Avg Unit Price:</span>
              <span className="font-medium text-amber-400">
                {formatCurrency(point.avgPrice)}
              </span>
            </div>
            {point.percentage !== undefined && (
              <div className="flex justify-between gap-4 pt-1 border-t border-slate-800">
                <span className="text-slate-400">Share of Total:</span>
                <span className="font-medium text-white">
                  {point.percentage}%
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs mb-6 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{metricLabel}</span>
            <span className="text-slate-400 dark:text-slate-500 text-sm font-normal">by</span>
            <span className="text-blue-700 dark:text-blue-400 capitalize">
              {dimension === 'date' ? 'Date (Timeline)' : dimension === 'paymentMethod' ? 'Payment Method' : 'Product'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Displaying {data.length} aggregated categories based on current active filters
          </p>
        </div>
      </div>

      <div className="w-full h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          {/* 1. Vertical Bar Chart */}
          {chartType === 'bar' && (
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: dimension === 'product' || dimension === 'date' ? 65 : 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="displayName"
                angle={dimension === 'product' || dimension === 'date' ? -35 : 0}
                textAnchor={dimension === 'product' || dimension === 'date' ? 'end' : 'middle'}
                interval={0}
                tick={{ fontSize: 11, fill: '#64748b' }}
                height={dimension === 'product' || dimension === 'date' ? 60 : 30}
              />
              <YAxis
                tickFormatter={(v) => (metric === 'revenue' || metric === 'avgPrice' ? `$${v}` : `${v}`)}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={45}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      dimension === 'paymentMethod'
                        ? PAYMENT_COLORS[entry.name] || PRODUCT_PALETTE[index % PRODUCT_PALETTE.length]
                        : PRODUCT_PALETTE[index % PRODUCT_PALETTE.length]
                    }
                  />
                ))}
                {showLabels && (
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(val: any) =>
                      typeof val === 'number'
                        ? metric === 'revenue'
                          ? `$${Math.round(val)}`
                          : val
                        : ''
                    }
                    style={{ fontSize: '10px', fill: '#475569', fontWeight: 600 }}
                  />
                )}
              </Bar>
            </BarChart>
          )}

          {/* 2. Horizontal Bar Chart */}
          {chartType === 'horizontal-bar' && (
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => (metric === 'revenue' || metric === 'avgPrice' ? `$${v}` : `${v}`)}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                tick={{ fontSize: 11, fill: '#475569' }}
                width={95}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-horiz-${index}`}
                    fill={
                      dimension === 'paymentMethod'
                        ? PAYMENT_COLORS[entry.name] || PRODUCT_PALETTE[index % PRODUCT_PALETTE.length]
                        : PRODUCT_PALETTE[index % PRODUCT_PALETTE.length]
                    }
                  />
                ))}
                {showLabels && (
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(val: any) =>
                      typeof val === 'number'
                        ? metric === 'revenue'
                          ? `$${Math.round(val)}`
                          : val
                        : ''
                    }
                    style={{ fontSize: '10px', fill: '#475569', fontWeight: 600 }}
                  />
                )}
              </Bar>
            </BarChart>
          )}

          {/* 3. Stacked Bar Chart */}
          {chartType === 'stacked-bar' && (
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: dimension === 'product' || dimension === 'date' ? 65 : 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="displayName"
                angle={dimension === 'product' || dimension === 'date' ? -35 : 0}
                textAnchor={dimension === 'product' || dimension === 'date' ? 'end' : 'middle'}
                interval={0}
                tick={{ fontSize: 11, fill: '#64748b' }}
                height={dimension === 'product' || dimension === 'date' ? 60 : 30}
              />
              <YAxis
                tickFormatter={(v) => (metric === 'revenue' || metric === 'avgPrice' ? `$${v}` : `${v}`)}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />
              {PAYMENT_KEYS.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="paymentStack"
                  fill={PAYMENT_COLORS[key]}
                  maxBarSize={45}
                />
              ))}
            </BarChart>
          )}

          {/* 4. Line Chart */}
          {chartType === 'line' && (
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: dimension === 'product' || dimension === 'date' ? 65 : 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="displayName"
                angle={dimension === 'product' || dimension === 'date' ? -35 : 0}
                textAnchor={dimension === 'product' || dimension === 'date' ? 'end' : 'middle'}
                interval={dimension === 'date' ? Math.ceil(data.length / 15) : 0}
                tick={{ fontSize: 11, fill: '#64748b' }}
                height={dimension === 'product' || dimension === 'date' ? 60 : 30}
              />
              <YAxis
                tickFormatter={(v) => (metric === 'revenue' || metric === 'avgPrice' ? `$${v}` : `${v}`)}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, fill: '#1d4ed8' }}
              >
                {showLabels && (
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(val: any) =>
                      typeof val === 'number'
                        ? metric === 'revenue'
                          ? `$${Math.round(val)}`
                          : val
                        : ''
                    }
                    style={{ fontSize: '10px', fill: '#1e293b', fontWeight: 600 }}
                  />
                )}
              </Line>
            </LineChart>
          )}

          {/* 5. Area Chart */}
          {chartType === 'area' && (
            <AreaChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: dimension === 'product' || dimension === 'date' ? 65 : 20 }}
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="displayName"
                angle={dimension === 'product' || dimension === 'date' ? -35 : 0}
                textAnchor={dimension === 'product' || dimension === 'date' ? 'end' : 'middle'}
                interval={dimension === 'date' ? Math.ceil(data.length / 15) : 0}
                tick={{ fontSize: 11, fill: '#64748b' }}
                height={dimension === 'product' || dimension === 'date' ? 60 : 30}
              />
              <YAxis
                tickFormatter={(v) => (metric === 'revenue' || metric === 'avgPrice' ? `$${v}` : `${v}`)}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#areaGradient)"
              />
            </AreaChart>
          )}

          {/* 6. Pie Chart */}
          {chartType === 'pie' && (
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="displayName"
                cx="50%"
                cy="48%"
                outerRadius={135}
                label={
                  showLabels
                    ? ({ name, percentage }) => `${name} (${percentage}%)`
                    : false
                }
                labelLine={showLabels}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`pie-cell-${index}`}
                    fill={getDistinctDonutColor(index)}
                  />
                ))}
              </Pie>
            </PieChart>
          )}

          {/* 7. Donut Chart */}
          {chartType === 'donut' && (
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="displayName"
                cx="50%"
                cy="48%"
                innerRadius={70}
                outerRadius={135}
                paddingAngle={2}
                label={
                  showLabels
                    ? ({ name, percentage }) => `${name} (${percentage}%)`
                    : false
                }
                labelLine={showLabels}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`donut-cell-${index}`}
                    fill={getDistinctDonutColor(index)}
                  />
                ))}
              </Pie>
            </PieChart>
          )}

          {/* 8. Radar Chart */}
          {chartType === 'radar' && (
            <RadarChart cx="50%" cy="50%" outerRadius={130} data={data.slice(0, 12)}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="displayName"
                tick={{ fontSize: 11, fill: '#475569' }}
              />
              <PolarRadiusAxis angle={30} stroke="#94a3b8" />
              <Radar
                name={metricLabel}
                dataKey="value"
                stroke="#2563eb"
                fill="#3b82f6"
                fillOpacity={0.4}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </RadarChart>
          )}

          {/* 9. Scatter Plot */}
          {chartType === 'scatter' && (
            <ScatterChart
              margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number"
                dataKey="volume"
                name="Units Sold"
                unit=" units"
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                type="number"
                dataKey="revenue"
                name="Revenue"
                unit="$"
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <ZAxis
                type="number"
                dataKey="avgPrice"
                range={[60, 400]}
                name="Avg Price"
                unit="$"
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Scatter name="Categories" data={data} fill="#2563eb">
                {data.map((entry, index) => (
                  <Cell
                    key={`scatter-cell-${index}`}
                    fill={PRODUCT_PALETTE[index % PRODUCT_PALETTE.length]}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
