import React from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  Presentation,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { DataProfileMetrics } from '../types';

interface ProfilingSummaryProps {
  profile: DataProfileMetrics;
  datasetName: string;
  onOpenPresentation: () => void;
  onOpenHealthCheck: () => void;
}

export function ProfilingSummary({
  profile,
  datasetName,
  onOpenPresentation,
  onOpenHealthCheck,
}: ProfilingSummaryProps) {
  const trend = profile.timeTrend;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Factual Profiling & Data Quality Audit
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {profile.healthScore}% Certified Clean
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Source: <span className="font-medium text-slate-700 dark:text-slate-300">{datasetName}</span> • Strictly deterministic statistics, zero AI hallucination
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenHealthCheck}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Health Check Rules
          </button>
          <button
            type="button"
            onClick={onOpenPresentation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>Open Presentation</span>
          </button>
        </div>
      </div>

      {/* Profiling Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
        {/* Box 1: Rankings (Top & Bottom Performers) */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Ranked Performers
            </span>
            <span className="text-[11px] font-normal text-slate-500">
              {profile.uniqueProductsCount} total items
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">#1 Top Performer:</span>
              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                {profile.topPerformers[0]?.name || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Top Revenue Share:</span>
              <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                ${(profile.topPerformers[0]?.revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({(profile.topPerformers[0]?.sharePercent ?? 0).toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500">Lowest Performer:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                {profile.bottomPerformers[0]?.name || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Box 2: Time Trend & Velocity */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Timeline & Velocity
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {profile.dateRange.daysSpan} days
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Growth Velocity:</span>
              <span className="font-semibold flex items-center gap-1">
                {trend.growthRatePercent > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                ) : trend.growthRatePercent < 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span
                  className={
                    (trend.growthRatePercent ?? 0) >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {(trend.growthRatePercent ?? 0) >= 0 ? '+' : ''}
                  {(trend.growthRatePercent ?? 0).toFixed(1)}%
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Peak Sales Date:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {trend.peakDate || '-'} (${(trend.peakRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500">Daily Run-Rate:</span>
              <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                ${(trend.avgDailyRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day
              </span>
            </div>
          </div>
        </div>

        {/* Box 3: Data Quality & Governance */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-500" />
              Audited Integrity
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Verified
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Audited Clean Records:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {(profile.retainedRecords ?? 0).toLocaleString()} rows
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Distortion Filtered Rows:</span>
              <span className="font-medium text-slate-600 dark:text-slate-400">
                {(profile.excludedRecords ?? 0).toLocaleString()} excluded
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500">Median Transaction:</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                ${(profile.medianPrice ?? 0).toFixed(2)} (Min: ${(profile.minPrice ?? 0).toFixed(2)}, Max: ${(profile.maxPrice ?? 0).toFixed(2)})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
