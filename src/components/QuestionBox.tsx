import React, { useState } from 'react';
import { Search, CornerDownLeft, HelpCircle, X } from 'lucide-react';
import {
  processUserQuestion,
  ProcessQuestionResult,
  NLContext,
  COMPLEX_QUERY_FALLBACK_MESSAGE,
} from '../utils/naturalLanguageEngine';
import { SemanticClassification } from '../utils/semanticAnalyzer';

interface QuestionBoxProps {
  headers: string[];
  semanticInfo: SemanticClassification;
  records: Record<string, any>[];
  currentDimension: string;
  currentMetric: string;
  currentChartType: 'bar' | 'horizontal-bar' | 'line' | 'donut';
  onApplyQuery: (result: ProcessQuestionResult) => void;
  onReset?: () => void;
}

export function QuestionBox({
  headers,
  semanticInfo,
  records,
  currentDimension,
  currentMetric,
  currentChartType,
  onApplyQuery,
  onReset,
}: QuestionBoxProps) {
  const [query, setQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(null);

  /**
   * Reversion Logic & Chart.js Lifecycle:
   * Clears query, hides error, destroys active Chart instance, and reverts
   * the dashboard back to window.defaultDimension & window.defaultMetric.
   */
  const resetDashboard = () => {
    // 2. Guard Clause for the Clear Button:
    // If no dataset is currently active, clicking "Clear" should do absolutely nothing.
    if (typeof window !== 'undefined' && (!window.activeDataset || window.activeDataset.length === 0)) {
      return;
    }

    // Clear search input value and hide error tags
    setQuery('');
    setErrorMessage(null);
    setLastSuccessMessage(null);

    // Destroy existing Chart.js instance (to prevent ghosting)
    if (typeof window !== 'undefined' && window.activeChartInstance) {
      try {
        window.activeChartInstance.destroy();
      } catch (err) {
        console.warn('Error destroying chart instance:', err);
      }
      window.activeChartInstance = null;
    }

    if (onReset) {
      onReset();
    } else if (typeof window !== 'undefined' && typeof window.resetDashboard === 'function') {
      window.resetDashboard();
    }
  };

  const handleExecute = (targetQuery?: string) => {
    const q = (targetQuery !== undefined ? targetQuery : query).trim();
    if (!q) {
      resetDashboard();
      return;
    }

    setErrorMessage(null);
    setLastSuccessMessage(null);

    const context: NLContext = {
      headers,
      semanticInfo,
      records,
      currentDimension,
      currentMetric,
      currentChartType,
    };

    const result = processUserQuestion(q, context);

    if (!result.success || result.error) {
      setErrorMessage(result.error || COMPLEX_QUERY_FALLBACK_MESSAGE);
      return;
    }

    setErrorMessage(null);
    setLastSuccessMessage(result.explanation || `Updated to ${result.metric} by ${result.dimension}`);
    onApplyQuery(result);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query || query.trim() === '') {
      resetDashboard();
      return;
    }
    handleExecute();
  };

  // Dynamic suggestion chips based on active dataset
  const suggestedPills = [
    `Top ${currentDimension} by ${currentMetric.split(' ')[0]}`,
    semanticInfo.temporal.length > 0 ? 'Trend of sales over time' : `Most expensive ${currentDimension}`,
    `Lowest ${currentMetric.split(' ')[0]}`,
  ];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs transition-colors h-full flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3
              className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight"
              style={{ fontWeight: 800 }}
            >
              Ask Your Data
            </h3>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Turn plain English into instant visual insights.
            </p>
          </div>
        </div>

        {/* Query Input Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={`Ask e.g. "Top ${currentDimension} by ${currentMetric.split(' ')[0]}" or "Trend over time"...`}
              className="w-full pl-3.5 pr-36 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all"
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={resetDashboard}
                title="Clear query and reset chart to baseline"
                className="px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs hover:shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Analyze</span>
                <CornerDownLeft className="w-3 h-3 opacity-80" />
              </button>
            </div>
          </div>

          {/* Hidden <p> tag for error messages (styled in red text, revealed when error occurs) */}
          <p
            id="question-box-error-msg"
            className={`text-xs font-semibold text-rose-600 dark:text-rose-400 mt-2 ${
              errorMessage ? 'block' : 'hidden'
            }`}
          >
            {errorMessage}
          </p>

          {/* Success Status Pill */}
          {lastSuccessMessage && !errorMessage && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{lastSuccessMessage}</span>
            </div>
          )}
        </form>
      </div>

      {/* Suggested Quick Queries */}
      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
          <HelpCircle className="w-3 h-3 text-slate-400" />
          <span>Quick queries:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {suggestedPills.map((pill, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(pill);
                handleExecute(pill);
              }}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 border border-slate-200/70 dark:border-slate-700/60 transition-all cursor-pointer"
            >
              {pill}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
