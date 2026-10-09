import { Sparkles, CheckCircle2 } from 'lucide-react';
import { AggregatedResultPoint, generateKeyTakeaways } from '../utils/semanticAnalyzer';

interface KeyTakeawaysCardProps {
  aggregatedData: AggregatedResultPoint[];
  dimensionName: string;
  metricName: string;
  currencySymbol?: string;
}

export function KeyTakeawaysCard({
  aggregatedData,
  dimensionName,
  metricName,
  currencySymbol = '$',
}: KeyTakeawaysCardProps) {
  const takeaways = generateKeyTakeaways(
    aggregatedData,
    dimensionName,
    metricName,
    currencySymbol
  );

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs transition-colors h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3
            className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight"
            style={{ fontWeight: 800 }}
          >
            Key Takeaways
          </h3>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Key performance drivers for {metricName} across {dimensionName}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {takeaways.map((bullet, idx) => {
          const colonIdx = bullet.indexOf(':');
          const hasLabel =
            colonIdx > 0 &&
            (bullet.startsWith('Top Performer:') ||
              bullet.startsWith('Concentration:') ||
              bullet.startsWith('Performance Gap:'));

          return (
            <li key={idx} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold">
                {idx + 1}
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {hasLabel ? (
                  <>
                    <strong className="font-bold text-slate-900 dark:text-white">
                      {bullet.slice(0, colonIdx + 1)}
                    </strong>{' '}
                    <span>{bullet.slice(colonIdx + 1).trim()}</span>
                  </>
                ) : (
                  bullet
                )}
              </p>
            </li>
          );
        })}
      </ul>
      </div>
    </div>
  );
}
