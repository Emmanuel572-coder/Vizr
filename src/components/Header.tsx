import {
  ArrowLeft,
  Download,
  Sun,
  Moon,
  Presentation,
  FileSpreadsheet,
} from 'lucide-react';

interface HeaderProps {
  datasetName: string;
  totalRecords: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onExportCSV: () => void;
  onOpenPresentation?: () => void;
  onGoToLanding: () => void;
}

export function Header({
  datasetName,
  totalRecords,
  theme,
  onToggleTheme,
  onExportCSV,
  onOpenPresentation,
  onGoToLanding,
}: HeaderProps) {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Left: Return trigger & Dataset title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoToLanding}
            className="flex items-center gap-2 group cursor-pointer hover:opacity-90 transition-opacity"
            title="Go to Vizr home"
          >
            <div className="w-6.5 h-7 rounded-lg bg-slate-900 dark:bg-slate-800 p-1 flex items-center justify-center shadow-xs">
              <svg viewBox="0 0 200 216" className="w-full h-full" fill="none">
                <rect x="10" y="128" width="34" height="78" rx="7" fill="#2563eb" />
                <rect x="52" y="88" width="34" height="118" rx="7" fill="#3b82f6" />
                <rect x="94" y="48" width="34" height="158" rx="7" fill="#60a5fa" />
                <rect x="136" y="8" width="38" height="198" rx="7" fill="#1d4ed8" />
                <path d="M 174,18 L 188,32 L 188,196 L 174,206 Z" fill="#172554" />
              </svg>
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors hidden sm:inline">
              Vizr
            </span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:border-slate-800" />

          <button
            type="button"
            onClick={onGoToLanding}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Upload New</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:border-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {datasetName}
            </span>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {totalRecords} rows
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {onOpenPresentation && (
            <button
              type="button"
              onClick={onOpenPresentation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Open presentation deck (16:9 widescreen)"
            >
              <Presentation className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span className="hidden sm:inline">Presentation</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Download clean CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
