import { useState } from 'react';
import { AggregatedDataPoint, MetricType, DimensionType } from '../types';
import { formatCurrency, formatNumber, PAYMENT_COLORS } from '../utils/analytics';
import { ArrowUpDown, Table as TableIcon } from 'lucide-react';

interface DataBreakdownTableProps {
  data: AggregatedDataPoint[];
  dimension: DimensionType;
  metric: MetricType;
}

export function DataBreakdownTable({ data, dimension, metric }: DataBreakdownTableProps) {
  const [sortField, setSortField] = useState<'name' | 'revenue' | 'volume' | 'avgPrice'>('revenue');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: 'name' | 'revenue' | 'volume' | 'avgPrice') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else {
      comparison = (a[sortField] || 0) - (b[sortField] || 0);
    }
    return sortAsc ? comparison : -comparison;
  });

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalVolume = data.reduce((sum, d) => sum + d.volume, 0);

  const dimensionName =
    dimension === 'date'
      ? 'Date'
      : dimension === 'paymentMethod'
      ? 'Payment Method'
      : 'Product';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs mb-6 transition-colors">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {dimensionName} Summary Breakdown
          </h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {data.length} categories
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  <span>{dimensionName}</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                onClick={() => handleSort('revenue')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Revenue</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                onClick={() => handleSort('volume')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Units Sold</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </div>
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                onClick={() => handleSort('avgPrice')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Avg Price</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Share of Sales
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {sortedData.map((row, idx) => {
              const share = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0;
              return (
                <tr key={idx} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      {dimension === 'paymentMethod' && (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PAYMENT_COLORS[row.name] || '#94a3b8' }}
                        />
                      )}
                      <span>{row.displayName || row.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                    {formatNumber(row.volume)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                    {formatCurrency(row.avgPrice)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-slate-500 dark:text-slate-400 font-medium">
                        {(share ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-semibold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
            <tr>
              <td className="px-4 py-2.5">Total / Average</td>
              <td className="px-4 py-2.5 text-right">{formatCurrency(totalRevenue)}</td>
              <td className="px-4 py-2.5 text-right">{formatNumber(totalVolume)}</td>
              <td className="px-4 py-2.5 text-right">
                {totalVolume > 0 ? formatCurrency(totalRevenue / totalVolume) : '$0.00'}
              </td>
              <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-400">100.0%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
