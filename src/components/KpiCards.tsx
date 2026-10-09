import { KpiConfigItem } from '../types';

interface KpiCardsProps {
  dynamicKpis?: KpiConfigItem[];
}

export function KpiCards({ dynamicKpis }: KpiCardsProps) {
  if (!dynamicKpis || dynamicKpis.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {dynamicKpis.slice(0, 4).map((kpi, idx) => (
        <div
          key={idx}
          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {kpi.title}
          </div>
          <div
            title={kpi.value}
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1.5 truncate"
          >
            {kpi.value}
          </div>
          <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1 truncate">
            {kpi.subtext}
          </div>
        </div>
      ))}
    </div>
  );
}
