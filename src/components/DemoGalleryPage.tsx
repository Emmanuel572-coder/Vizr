import React, { useState } from 'react';
import {
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Table,
  Search,
  Sparkles,
  Download,
  Coffee,
  ShoppingBag,
  Cloud,
  Laptop,
  Dumbbell,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { DEMO_SHEETS, DemoSheet } from '../data/demoSheets';

interface DemoGalleryPageProps {
  onBackToLanding: () => void;
  onSelectSheetForHealthCheck: (matrix: string[][], sheetName: string) => void;
  onDirectLoadSheet: (matrix: string[][], sheetName: string) => void;
}

export function DemoGalleryPage({
  onBackToLanding,
  onSelectSheetForHealthCheck,
  onDirectLoadSheet,
}: DemoGalleryPageProps) {
  // Currently selected sheet for preview
  const [selectedSheetId, setSelectedSheetId] = useState<string>(DEMO_SHEETS[0].id);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const activeSheet = DEMO_SHEETS.find((s) => s.id === selectedSheetId) || DEMO_SHEETS[0];

  // Helper icon renderer
  const renderIcon = (iconName: DemoSheet['iconName'], className: string = 'w-5 h-5') => {
    switch (iconName) {
      case 'coffee':
        return <Coffee className={className} />;
      case 'shopping-bag':
        return <ShoppingBag className={className} />;
      case 'cloud':
        return <Cloud className={className} />;
      case 'laptop':
        return <Laptop className={className} />;
      case 'dumbbell':
        return <Dumbbell className={className} />;
      default:
        return <FileSpreadsheet className={className} />;
    }
  };

  // Filtered rows in preview
  const filteredRows = activeSheet.rows.filter((row) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return row.some((cell) => cell.toLowerCase().includes(q));
  });

  // Construct raw matrix (headers + data rows)
  const getMatrixForSheet = (sheet: DemoSheet): string[][] => {
    return [sheet.headers, ...sheet.rows];
  };

  const handleLaunchHealthCheck = (sheet: DemoSheet) => {
    onSelectSheetForHealthCheck(getMatrixForSheet(sheet), sheet.title);
  };

  const handleDirectLaunch = (sheet: DemoSheet) => {
    onDirectLoadSheet(getMatrixForSheet(sheet), sheet.title);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Upload</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Relatable Demo Spreadsheets</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Choose any dataset to preview rows, test pre-flight data cleaning, and explore interactive charts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleLaunchHealthCheck(activeSheet)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
              <span>Audit & Load Selected Sheet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Intro Banner */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 dark:from-emerald-950/30 dark:via-blue-950/30 dark:to-purple-950/30 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-emerald-700 dark:text-emerald-300 uppercase bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              No Spreadsheet On Hand?
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
              5 Real-World Datasets Ready for Instant Visualization
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
              Click any spreadsheet below to inspect its raw rows, column distributions, and financial aggregates. You can run our pre-flight health scanner to audit the dataset or jump directly into the interactive visualization dashboard.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleDirectLaunch(activeSheet)}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              Direct Dashboard Launch
            </button>
          </div>
        </div>

        {/* 5 Sheet Selector Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {DEMO_SHEETS.map((sheet) => {
            const isSelected = sheet.id === selectedSheetId;
            return (
              <div
                key={sheet.id}
                onClick={() => {
                  setSelectedSheetId(sheet.id);
                  setSearchFilter('');
                }}
                className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-emerald-500 dark:border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                }`}
              >
                <div>
                  {/* Top Badge & Excel pill */}
                  <div className="flex items-center justify-between gap-1 mb-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sheet.badgeColor}`}
                    >
                      {sheet.category}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      .{sheet.fileFormat.toLowerCase()}
                    </span>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-200'
                      }`}
                    >
                      {renderIcon(sheet.iconName, 'w-4 h-4')}
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
                      {sheet.title}
                    </h3>
                  </div>
                </div>

                {/* Card Footer Info */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 font-mono">
                    {sheet.rowCount} records
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {sheet.totalVolumeEst}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Sheet Interactive Excel-Style Previewer */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden flex flex-col">
          {/* Excel Title Bar */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeSheet.title}
                  </h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {activeSheet.fileName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing {filteredRows.length} of {activeSheet.rowCount} rows • {activeSheet.columnCount} columns • Est. Volume: {activeSheet.totalVolumeEst}
                </p>
              </div>
            </div>

            {/* Search filter within spreadsheet & Actions */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search in sheet..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 w-44"
                />
              </div>

              <button
                type="button"
                onClick={() => handleLaunchHealthCheck(activeSheet)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs cursor-pointer"
                title="Run Pre-Flight Data Health Check on this sheet"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Pre-Flight Audit</span>
              </button>

              <button
                type="button"
                onClick={() => handleDirectLaunch(activeSheet)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer"
                title="Launch directly into dashboard"
              >
                <span>Launch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Excel Spreadsheet Column Coordinates & Grid */}
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse font-sans">
              {/* Column Letter Coordinate Row (A, B, C, D, E) */}
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 font-mono text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="w-12 py-1.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-900">
                    #
                  </th>
                  {activeSheet.headers.map((_, colIdx) => (
                    <th
                      key={colIdx}
                      className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center font-bold"
                    >
                      {String.fromCharCode(65 + colIdx)}
                    </th>
                  ))}
                </tr>
                {/* Header Labels Row */}
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold border-b border-slate-300 dark:border-slate-700">
                  <th className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700 text-slate-400">
                    1
                  </th>
                  {activeSheet.headers.map((h, i) => (
                    <th
                      key={i}
                      className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Data Rows */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
                {filteredRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors"
                  >
                    {/* Excel Row Number Index */}
                    <td className="py-2 px-3 text-center text-slate-400 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 select-none">
                      {rIdx + 2}
                    </td>

                    {/* Order Number */}
                    <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-300">
                      {row[0]}
                    </td>

                    {/* Product Name */}
                    <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-semibold font-sans text-slate-900 dark:text-white">
                      {row[1]}
                    </td>

                    {/* Price / Amount */}
                    <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 font-semibold text-emerald-600 dark:text-emerald-400 text-right">
                      ${(parseFloat(row[2]) || 0).toFixed(2)}
                    </td>

                    {/* Date */}
                    <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">
                      {row[3]}
                    </td>

                    {/* Payment Method */}
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-sans">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium border border-slate-200/60 dark:border-slate-700">
                        {row[4]}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={activeSheet.headers.length + 1}
                      className="py-10 text-center text-slate-400 font-sans"
                    >
                      No rows match the search query "{searchFilter}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Spreadsheet Bottom Status Bar */}
          <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Ready • Sheet1 of 1</span>
            </span>
            <div className="flex items-center gap-4">
              <span>Rows: {filteredRows.length}</span>
              <span>Cols: {activeSheet.columnCount}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Sum (Price): {activeSheet.totalVolumeEst}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 mt-8 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>DataFlow Demo Gallery • 5 curated spreadsheet templates</span>
          <button
            type="button"
            onClick={onBackToLanding}
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            ← Return to Upload Dropzone
          </button>
        </div>
      </footer>
    </div>
  );
}
