import { useState, useMemo, useEffect } from 'react';
import { formatNumber, detectCurrency, getColumnCurrency } from '../utils/currencyEngine';
import { isOmniNull } from '../utils/omniNull';
import { ArrowUpDown, ChevronLeft, ChevronRight, ListFilter, Trash2, Download } from 'lucide-react';

interface TransactionHistoryTableProps {
  records?: Record<string, any>[];
  dataset?: Record<string, any>[];
  onDeleteRecord?: (id: string) => void;
  customColumns?: string[];
  onExportCSV?: () => void;
}

export function TransactionHistoryTable({
  records,
  dataset: propDataset,
  onDeleteRecord,
  customColumns,
  onExportCSV,
}: TransactionHistoryTableProps) {
  // Use window.activeDataset as the absolute single source of truth
  const rawDataset =
    (typeof window !== 'undefined' && window.activeDataset && window.activeDataset.length > 0)
      ? window.activeDataset
      : propDataset || records || [];

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  /**
   * 1. Extract headers: const headers = Object.keys(dataset[0]);
   * Explicitly extracts headers from object keys of the first row.
   * Strips internal private tracking keys (like 'id') if present.
   */
  const headers = useMemo(() => {
    if (rawDataset && rawDataset.length > 0 && rawDataset[0]) {
      const keys = Object.keys(rawDataset[0]).filter((k) => k !== 'id' && !k.startsWith('_'));
      if (keys.length > 0) return keys;
    }
    return customColumns || [];
  }, [rawDataset, customColumns]);

  // Set default sort key to the first extracted header
  useEffect(() => {
    if (headers.length > 0 && !sortKey) {
      setSortKey(headers[0]);
    }
  }, [headers, sortKey]);

  /**
   * 4. Never use dataset[0] as a data row if it is being used to define the headers:
   * If dataset[0] contains the header names as its values (i.e. every cell matches the header name),
   * it was used as the header definition row, so slice it away from data rows.
   */
  const isFirstRowHeader = useMemo(() => {
    if (!rawDataset || rawDataset.length === 0 || !rawDataset[0]) return false;
    const firstRow = rawDataset[0];
    return (
      headers.length > 0 &&
      headers.every(
        (h) =>
          firstRow[h] !== undefined &&
          String(firstRow[h]).trim().toLowerCase() === h.trim().toLowerCase()
      )
    );
  }, [rawDataset, headers]);

  const dataRows = useMemo(() => {
    if (!rawDataset || rawDataset.length === 0) return [];
    if (isFirstRowHeader) {
      return rawDataset.slice(1);
    }
    return rawDataset;
  }, [rawDataset, isFirstRowHeader]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedRecords = useMemo(() => {
    if (!sortKey) return dataRows;
    return [...dataRows].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [dataRows, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const pageRecords = sortedRecords.slice(startIndex, startIndex + pageSize);

  const formatCellValue = (val: any, headerName: string) => {
    if (val === null || val === undefined || val === '' || isOmniNull(val)) {
      return <span className="text-slate-400 italic font-mono">-</span>;
    }

    const isMonetaryCol = /revenue|cost|salary|fee|fees|budget|spend|price|ngn|amount|\$/i.test(headerName);
    if (isMonetaryCol) {
      if (typeof val === 'number') {
        return <span className="font-mono text-slate-700 dark:text-slate-200">{val.toLocaleString('en-US')}</span>;
      }
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
          const num = parseFloat(trimmed);
          if (!isNaN(num)) {
            return <span className="font-mono text-slate-700 dark:text-slate-200">{num.toLocaleString('en-US')}</span>;
          }
        }
      }
    }

    // Retain original formatting (e.g., "$1,500", "1,935,263") for the HTML table view
    return <span className="font-mono text-slate-700 dark:text-slate-200">{String(val)}</span>;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs mb-8 transition-colors">
      {/* Table Header Bar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Raw Spreadsheet Records
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono">
            {dataRows.length} total rows
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onExportCSV && (
            <button
              type="button"
              onClick={onExportCSV}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md transition-colors cursor-pointer"
              title="Export exact raw dataset as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Records per page"
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-mono px-1">
              Page {validCurrentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {/* 2. Loop through headers to generate the <th> elements */}
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th scope="col" className="w-12 px-3 py-3 text-center text-slate-400 font-normal">
                #
              </th>
              {headers.map((header) => (
                <th
                  key={header}
                  scope="col"
                  onClick={() => handleSort(header)}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{header}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              ))}
              {onDeleteRecord && (
                <th scope="col" className="px-4 py-3 text-right">
                  Action
                </th>
              )}
            </tr>
          </thead>

          {/* 3. Loop through the dataset array, and for each row, use row[header] to generate the <td> elements */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
            {pageRecords.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length + (onDeleteRecord ? 2 : 1)}
                  className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 font-sans"
                >
                  No transaction records match the current filters.
                </td>
              </tr>
            ) : (
              pageRecords.map((row, rIdx) => (
                <tr
                  key={row.id || startIndex + rIdx}
                  className="hover:bg-slate-50/75 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-3 py-2.5 text-center text-slate-400 select-none">
                    {startIndex + rIdx + 1}
                  </td>
                  {headers.map((header) => (
                    <td key={header} className="px-4 py-2.5 font-sans">
                      {formatCellValue(row[header], header)}
                    </td>
                  ))}
                  {onDeleteRecord && (
                    <td className="px-4 py-2.5 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => onDeleteRecord(row.id || String(startIndex + rIdx))}
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
