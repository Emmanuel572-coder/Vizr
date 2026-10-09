import { useState } from 'react';
import { RAW_CSV_DATA } from '../data/initialData';
import { SalesRecord } from '../types';
import { X, Copy, Check, FileText } from 'lucide-react';

interface DatasetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRecords: SalesRecord[];
}

export function DatasetPreviewModal({
  isOpen,
  onClose,
  activeRecords,
}: DatasetPreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'provided' | 'current'>('provided');

  if (!isOpen) return null;

  const currentCSV = [
    'Order Number,Product,Price,Date,Payment Method',
    ...activeRecords.map(
      (r) =>
        `${r.orderNumber || ''},${r.product || ''},$${(typeof r.price === 'number' ? r.price : parseFloat(String(r.price || 0)) || 0).toFixed(2)},${r.date || ''},${r.paymentMethod || ''}`
    ),
  ].join('\n');

  const textToDisplay = viewMode === 'provided' ? RAW_CSV_DATA : currentCSV;

  const handleCopy = () => {
    navigator.clipboard.writeText(textToDisplay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] transition-colors">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Dataset Inspection
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Accurate source dataset provided for apparel sales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setViewMode('provided')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'provided'
                  ? 'bg-white dark:bg-slate-700 shadow-2xs text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Original 116 Rows
            </button>
            <button
              type="button"
              onClick={() => setViewMode('current')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'current'
                  ? 'bg-white dark:bg-slate-700 shadow-2xs text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Active Filtered Data ({activeRecords.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Copy CSV</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-slate-800 dark:text-slate-200 bg-slate-900/5 dark:bg-slate-950/40">
          <pre className="whitespace-pre-wrap select-all leading-relaxed p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
            {textToDisplay}
          </pre>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
