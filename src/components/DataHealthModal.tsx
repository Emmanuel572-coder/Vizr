import { useState } from 'react';
import {
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
  Trash2,
  EyeOff,
  Check,
} from 'lucide-react';
import { DataHealthScanResult, PreFlightRemediationMode } from '../types';

interface DataHealthModalProps {
  isOpen: boolean;
  scanResult: DataHealthScanResult | null;
  datasetName: string;
  onApplyFix?: (mode: PreFlightRemediationMode) => void;
  onApplyRecommendedFixes?: () => void;
  onRemoveRowsWithNulls?: () => void;
  onIgnore?: () => void;
  onCancel: () => void;
}

export function DataHealthModal({
  isOpen,
  scanResult,
  datasetName,
  onApplyFix,
  onApplyRecommendedFixes,
  onRemoveRowsWithNulls,
  onIgnore,
  onCancel,
}: DataHealthModalProps) {
  const [selectedMode, setSelectedMode] = useState<PreFlightRemediationMode>('median');

  if (!isOpen || !scanResult) return null;

  const nullCount =
    scanResult.omniNullRows && scanResult.omniNullRows.length > 0
      ? scanResult.omniNullRows.length
      : scanResult.missingNumericRows.length;
  const summaryCount = scanResult.summaryRows.length;
  const totalIssuesCount = (nullCount > 0 ? 1 : 0) + (summaryCount > 0 ? 1 : 0);

  const handleExecute = (mode: PreFlightRemediationMode) => {
    if (onApplyFix) {
      onApplyFix(mode);
    } else if (mode === 'remove_rows' && onRemoveRowsWithNulls) {
      onRemoveRowsWithNulls();
    } else if (mode === 'ignore' && onIgnore) {
      onIgnore();
    } else if (onApplyRecommendedFixes) {
      onApplyRecommendedFixes();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      data-testid="data-issues-modal"
      aria-label="Data Issues"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
            <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
          </div>

          <div className="space-y-1">
            <h2
              className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white"
              style={{ fontWeight: 800 }}
              data-testid="data-issues-heading"
            >
              Data Issues Detected
            </h2>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Found {totalIssuesCount} data issue{totalIssuesCount > 1 ? 's' : ''} in{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {datasetName}
              </span>
              . Choose how you would like to handle them:
            </p>
          </div>
        </div>

        {/* Issue Summary Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {nullCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
              <AlertTriangle className="w-3.5 h-3.5" />
              {nullCount} null or N/A value{nullCount > 1 ? 's' : ''}
            </span>
          )}
          {summaryCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
              <Layers className="w-3.5 h-3.5" />
              {summaryCount} summary/total row{summaryCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Remediation Options Selection Cards */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Select Remediation Strategy:
          </label>

          {/* Option 1: Replace with Median (Recommended) */}
          <div
            onClick={() => setSelectedMode('median')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
              selectedMode === 'median'
                ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                selectedMode === 'median'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
              }`}
            >
              {selectedMode === 'median' && <Check className="w-3 h-3 stroke-[3]" />}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Replace Nulls &amp; N/A with Column Median
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Safely imputes missing, blank, and N/A values using calculated medians. Retains all data rows without skewing totals.
              </p>
            </div>
          </div>

          {/* Option 2: Remove rows with nulls entirely */}
          <div
            onClick={() => setSelectedMode('remove_rows')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
              selectedMode === 'remove_rows'
                ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-500 dark:border-rose-500 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                selectedMode === 'remove_rows'
                  ? 'bg-rose-600 border-rose-600 text-white'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
              }`}
            >
              {selectedMode === 'remove_rows' && <Check className="w-3 h-3 stroke-[3]" />}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  Remove Rows with Nulls or N/A Entirely
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  Strict Clean
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Discards the {nullCount} affected row{nullCount > 1 ? 's' : ''} containing null or N/A cells so analysis is conducted strictly on 100% complete records.
              </p>
            </div>
          </div>

          {/* Option 3: Ignore and keep raw data */}
          <div
            onClick={() => setSelectedMode('ignore')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
              selectedMode === 'ignore'
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                selectedMode === 'ignore'
                  ? 'bg-slate-700 border-slate-700 dark:bg-slate-300 dark:border-slate-300 text-white dark:text-slate-900'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
              }`}
            >
              {selectedMode === 'ignore' && <Check className="w-3 h-3 stroke-[3]" />}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  Ignore &amp; Keep Raw Data
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  As-Is
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Keeps the raw dataset completely untouched. N/A and null values will be preserved as-is (treated as 0 in metric charts).
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Button based on selection */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            data-testid={selectedMode === 'median' ? 'apply-recommended-fixes' : 'apply-fix-button'}
            onClick={() => handleExecute(selectedMode)}
            className={`w-full py-3.5 px-5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedMode === 'remove_rows'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : selectedMode === 'ignore'
                ? 'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white'
                : 'bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white'
            }`}
          >
            {selectedMode === 'median' && <Sparkles className="w-4 h-4 text-blue-200" />}
            {selectedMode === 'remove_rows' && <Trash2 className="w-4 h-4 text-rose-200" />}
            {selectedMode === 'ignore' && <CheckCircle2 className="w-4 h-4 text-slate-200" />}

            <span>
              {selectedMode === 'median' && 'Apply Recommended Fixes (Median Imputation)'}
              {selectedMode === 'remove_rows' && `Remove ${nullCount} Incomplete / N/A Row(s) & Continue`}
              {selectedMode === 'ignore' && 'Ignore Warnings & Proceed with Raw Data'}
            </span>

            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          {/* Quick-action buttons bar */}
          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <button
              type="button"
              onClick={() => handleExecute('ignore')}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors cursor-pointer"
            >
              Quick: Ignore &amp; Continue
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
