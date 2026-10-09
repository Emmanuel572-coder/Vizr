import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  ShoppingBag,
  Bus,
  Code2,
  Ship,
  Film,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';
import { getProceduralDataset } from '../data/nigerianDatasets';
import { normalizeUploadedFile } from '../utils/fileNormalizationEngine';

interface LandingPageProps {
  onLoadMatrix: (matrix: string[][], sourceName: string) => void | Promise<void>;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const NIGERIAN_SAMPLE_CARDS: {
  id: string;
  title: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'jumia-konga',
    title: 'Jumia/Konga Sales',
    tagline: 'Order Date, Item, Region, Payment, Revenue NGN',
    icon: ShoppingBag,
  },
  {
    id: 'brt-danfo',
    title: 'BRT/Danfo Fleet',
    tagline: 'Route, Vehicle, Fuel Cost, Daily Revenue, Status',
    icon: Bus,
  },
  {
    id: 'yaba-payroll',
    title: 'Yaba Tech Payroll',
    tagline: 'Employee Role, Level, Monthly Salary, Score',
    icon: Code2,
  },
  {
    id: 'cocoa-cashew',
    title: 'Cocoa & Cashew',
    tagline: 'Month, Crop Type, Tons Exported, Destination, Fees',
    icon: Ship,
  },
  {
    id: 'nollywood-budget',
    title: 'Nollywood Budget',
    tagline: 'Expense Category, Planned Budget, Actual Spend',
    icon: Film,
  },
];

export function LandingPage({ onLoadMatrix, theme, onToggleTheme }: LandingPageProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    // AGGRESSIVE STATE MANAGEMENT: Completely clear and overwrite window.activeDataset before parsing new data
    window.activeDataset = [];
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      // Normalizes .csv (PapaParse), .xlsx (SheetJS), and .json (recursive flattening)
      const result = await normalizeUploadedFile(file);
      if (!result.matrix || result.matrix.length < 2) {
        throw new Error('The file must contain a header row and at least one data row.');
      }
      const displayName = file.name.replace(/\.[^/.]+$/, '');
      await onLoadMatrix(result.matrix, displayName);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to parse file. Please verify file formatting.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleSelectSample = (sampleId: string) => {
    // AGGRESSIVE STATE MANAGEMENT: Completely clear and overwrite window.activeDataset before loading sample
    window.activeDataset = [];
    const dataset = getProceduralDataset(sampleId);
    if (dataset) {
      onLoadMatrix(dataset.matrix, dataset.title);
    }
  };

  return (
    <div className="landing-container min-h-screen min-h-[100dvh] flex-1 w-full text-slate-900 dark:text-slate-100 flex flex-col justify-between p-6 pb-6 selection:bg-blue-100 dark:selection:bg-blue-900/60 selection:text-blue-900 font-sans relative overflow-hidden transition-colors duration-250 ease-out">
      {/* Sleek Theme Toggle Button */}
      {onToggleTheme && (
        <div className="absolute top-6 right-6 z-30">
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-2xs transition-[background-color,border-color,color,box-shadow] duration-250 ease-out cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-colors duration-250 ease-out" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 transition-colors duration-250 ease-out" />
            )}
          </button>
        </div>
      )}
      {/* Ambient slow-motion liquid gradient motion behind content (flowing, morphing like liquid, one faint color at a time, moving broadly around background) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 opacity-70 dark:opacity-60 transition-opacity duration-300 ease-out" aria-hidden="true">
        {/* Wide sweeping center liquid gradient body morphing and revolving */}
        <div className="absolute top-1/2 left-1/2 w-[54rem] h-[54rem] blur-[110px] filter landing-aura-sweeping opacity-45" />
        {/* Gentle undulating liquid tide wave */}
        <div className="absolute top-1/2 left-1/2 w-[60rem] h-[60rem] blur-[120px] filter landing-aura-liquid-wave opacity-35" />
        {/* Orbiting morphing liquid droplet 1 */}
        <div className="absolute -top-16 -left-16 w-[36rem] h-[36rem] blur-3xl filter landing-aura-orbit-1 opacity-65" />
        {/* Orbiting morphing liquid droplet 2 */}
        <div className="absolute top-1/4 -right-16 w-[40rem] h-[40rem] blur-3xl filter landing-aura-orbit-2 opacity-65" />
        {/* Orbiting morphing liquid droplet 3 at lower-left */}
        <div className="absolute -bottom-16 left-1/4 w-[38rem] h-[38rem] blur-3xl filter landing-aura-orbit-3 opacity-65" />
        {/* Orbiting morphing liquid droplet 4 at lower-right */}
        <div className="absolute -bottom-20 -right-16 w-[42rem] h-[42rem] blur-3xl filter landing-aura-orbit-1 opacity-60" />
      </div>

      {/* Landing Page Content (scaled down by 25% via html.landing-active zoom: 0.75) */}
      <div className="w-full flex-1 flex flex-col justify-between z-10">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center text-center space-y-7 my-auto">
          {/* Header Section */}
          <div className="w-full flex flex-col items-center">
            <h1
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[0.85] transition-colors duration-250 ease-out"
              style={{ fontWeight: 800, lineHeight: 0.85 }}
            >
              <span className="block whitespace-nowrap leading-[0.85] transition-colors duration-250 ease-out" style={{ lineHeight: 0.85 }}>
                Made for{' '}
                <span
                  className="font-great-vibes text-[1.25em] sm:text-[1.3em] font-normal tracking-normal inline-block px-1 align-baseline select-text leading-[0.85] transition-colors duration-250 ease-out"
                  style={{ fontWeight: 400, letterSpacing: 'normal', lineHeight: 0.85 }}
                >
                  Data
                </span>
              </span>
              <span className="block whitespace-nowrap -mt-0.5 sm:-mt-1.5 leading-[0.85] transition-colors duration-250 ease-out" style={{ lineHeight: 0.85 }}>
                <span
                  className="font-great-vibes text-[1.25em] sm:text-[1.3em] font-normal tracking-normal inline-block pl-1 pr-0.5 align-baseline select-text leading-[0.85] transition-colors duration-250 ease-out"
                  style={{ fontWeight: 400, letterSpacing: 'normal', lineHeight: 0.85 }}
                >
                  Visualization
                </span>
                . That&apos;s it.
              </span>
            </h1>
            <h2
              className="text-base sm:text-lg font-medium text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-snug mt-2.5 sm:mt-3 transition-colors duration-250 ease-out"
              style={{ fontWeight: 500, lineHeight: 1.35 }}
            >
              Transform your raw data into interactive charts and PowerPoint decks instantly.
            </h2>
          </div>

          {/* Glassmorphic Bordered Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`w-full max-w-2xl py-12 px-6 rounded-3xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3.5 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 transition-[background-color,border-color,color,box-shadow,transform] duration-250 ease-out ${
              isDragOver
                ? 'border-blue-600 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 scale-[1.01] shadow-lg'
                : 'border-slate-200/90 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm hover:shadow-md'
            } ${isProcessing ? 'opacity-70 pointer-events-none' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 text-blue-700 dark:text-blue-400 flex items-center justify-center transition-[background-color,color,transform] duration-250 ease-out group-hover:scale-110 shadow-2xs">
              {isProcessing ? (
                <Loader2 className="w-6 h-6 compositor-spin animate-spin text-blue-700 dark:text-blue-400" />
              ) : (
                <Upload className="w-6 h-6 stroke-[1.8] transition-colors duration-250 ease-out" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 transition-colors duration-250 ease-out">
                {isProcessing ? (
                  'Processing file...'
                ) : (
                  <>
                    Drop your CSV, XLSX, or JSON here, or{' '}
                    <span className="text-blue-700 dark:text-blue-400 underline decoration-blue-300 dark:decoration-blue-600 underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-250 ease-out">
                      browse
                    </span>
                  </>
                )}
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors duration-250 ease-out">
                Auto-detects format, flattens JSON &amp; generates interactive Chart.js dashboards
              </p>
            </div>

            {/* Format Badges */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs transition-[background-color,border-color,color] duration-250 ease-out">
                .csv
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs transition-[background-color,border-color,color] duration-250 ease-out">
                .xlsx
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs transition-[background-color,border-color,color] duration-250 ease-out">
                .json
              </span>
            </div>
          </div>

          {/* Error Feedback */}
          {errorMsg && (
            <div className="w-full max-w-2xl mx-auto text-xs py-2.5 px-3.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/60 backdrop-blur-sm border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-left shadow-2xs transition-[background-color,border-color,color] duration-250 ease-out">
              {errorMsg}
            </div>
          )}

          {/* Procedural Nigerian Sample Datasets Section */}
          <div className="w-full max-w-2xl mx-auto space-y-4 pt-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors duration-250 ease-out">
              Or try a sample dataset:
            </p>

            {/* 5 Clickable Glassmorphism Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full">
              {NIGERIAN_SAMPLE_CARDS.map((item) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSample(item.id)}
                    title={item.tagline}
                    className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 hover:bg-white/95 dark:hover:bg-slate-900/95 hover:border-blue-600/80 dark:hover:border-blue-500/80 hover:shadow-md transition-[background-color,border-color,color,box-shadow,transform] duration-250 ease-out cursor-pointer group text-slate-800 dark:text-slate-200 relative overflow-hidden shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 group-hover:bg-blue-50/90 dark:group-hover:bg-blue-950/70 text-slate-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 flex items-center justify-center mb-2 transition-[background-color,color] duration-250 ease-out shadow-2xs">
                      <IconComp className="w-4 h-4 stroke-[2] transition-colors duration-250 ease-out" />
                    </div>
                    <span className="text-xs font-bold tracking-tight text-center leading-tight transition-colors duration-250 ease-out">
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Landing Page Footer */}
        <footer className="w-full flex items-center justify-between pt-3 pb-1 transition-colors duration-250 ease-out select-none">
          {/* Bottom Left Brand: Vizr Logo & Name (clean, no background/outline, perfectly centered bars and text) */}
          <div className="inline-flex items-center gap-2.5 select-none">
            <div className="w-6.5 h-7 rounded-lg bg-slate-900 dark:bg-slate-800 p-1 flex items-center justify-center shrink-0 transition-colors duration-250 ease-out shadow-xs">
              <svg viewBox="0 0 200 216" className="w-full h-full" fill="none">
                <rect x="10" y="128" width="34" height="78" rx="7" fill="#2563eb" />
                <rect x="52" y="88" width="34" height="118" rx="7" fill="#3b82f6" />
                <rect x="94" y="48" width="34" height="158" rx="7" fill="#60a5fa" />
                <rect x="136" y="8" width="38" height="198" rx="7" fill="#1d4ed8" />
                <path d="M 174,18 L 188,32 L 188,196 L 174,206 Z" fill="#172554" />
              </svg>
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-800 dark:text-slate-100 transition-colors duration-250 ease-out leading-none flex items-center pt-px">
              Vizr
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 tracking-tight transition-colors duration-250 ease-out">
            <strong className="font-bold text-slate-700 dark:text-slate-200 transition-colors duration-250 ease-out">Your data. Your device.</strong>{' '}
            <span className="transition-colors duration-250 ease-out">100% client-side.</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
