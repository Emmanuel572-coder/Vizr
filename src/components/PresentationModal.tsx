import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import Chart from 'chart.js/auto';
import {
  ChevronLeft,
  ChevronRight,
  X,
  HelpCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { AggregatedDataPoint, SalesRecord } from '../types';
import { generateKeyTakeaways, AggregatedResultPoint } from '../utils/semanticAnalyzer';
import { formatNumber } from '../utils/currencyEngine';
import { getDistinctDonutColor } from '../utils/analytics';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetName: string;
  dimension: string;
  metric: string;
  chartType: 'bar' | 'horizontal-bar' | 'line' | 'donut';
  aggregatedData: AggregatedResultPoint[];
  records: SalesRecord[];
  currencySymbol?: string;
  theme?: 'light' | 'dark';
}

/**
 * Slide 3 Chart Canvas Component
 * Renders the active Chart.js canvas styled for the active page theme & fullscreen scaling
 */
function SlideChartCanvas({
  chartType,
  data,
  metricLabel,
  currencySymbol,
  theme = 'light',
  isFullscreen = false,
}: {
  chartType: 'bar' | 'horizontal-bar' | 'line' | 'donut';
  data: AggregatedResultPoint[];
  metricLabel: string;
  currencySymbol?: string;
  theme?: 'light' | 'dark';
  isFullscreen?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const renderedThemeRef = useRef(theme);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (!data || data.length === 0) return;

    const displayData = data.slice(0, 10);
    const labels = displayData.map((d) => d.displayName || d.name);
    const values = displayData.map((d) => d.value ?? 0);

    const isHorizontal = chartType === 'horizontal-bar';
    const isDonut = chartType === 'donut';
    const isLine = chartType === 'line';
    const isDark = theme === 'dark';

    const textColor = isDark ? '#94a3b8' : '#334155';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const borderColor = isDark ? '#334155' : '#cbd5e1';
    const tickFontSize = isFullscreen ? 13 : 11;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const interactionMode: 'nearest' | 'index' = isDonut ? 'nearest' : 'index';
    const interactionAxis: 'x' | 'y' = isHorizontal ? 'y' : 'x';

    const newChart = new Chart(ctx, {
      type: isDonut ? 'doughnut' : isLine ? 'line' : 'bar',
      data: {
        labels,
        datasets: [
          {
            label: metricLabel,
            data: values,
            backgroundColor: isDonut
              ? labels.map((_, i) => getDistinctDonutColor(i))
              : isLine
              ? 'rgba(59, 130, 246, 0.15)'
              : '#1d4ed8',
            hoverBackgroundColor: isDonut
              ? undefined
              : isLine
              ? 'rgba(37, 99, 235, 0.25)'
              : '#1e40af',
            borderColor: isDonut ? (isDark ? '#0f172a' : '#ffffff') : '#1d4ed8',
            hoverBorderColor: isDonut ? (isDark ? '#f8fafc' : '#0f172a') : (isLine ? '#1d4ed8' : '#60a5fa'),
            borderWidth: isDonut ? 2 : 2,
            hoverBorderWidth: isDonut ? 3 : 2,
            borderRadius: isDonut ? 0 : 6,
            hoverOffset: isDonut ? 12 : 0,
            fill: isLine,
            tension: 0.3,
            pointBackgroundColor: '#1d4ed8',
            pointBorderColor: '#ffffff',
            pointRadius: isFullscreen ? 6 : 5,
            pointHoverRadius: 8,
            pointHitRadius: 28,
            pointHoverBackgroundColor: '#1e40af',
            pointHoverBorderColor: '#93c5fd',
            pointHoverBorderWidth: 3,
            barPercentage: 0.80,
            categoryPercentage: 0.82,
            maxBarThickness: isHorizontal ? 28 : 52,
          },
        ],
      },
      options: {
        indexAxis: isHorizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        interaction: {
          mode: interactionMode,
          intersect: false,
          axis: interactionAxis,
        },
        hover: {
          mode: interactionMode,
          intersect: false,
          axis: interactionAxis,
        },
        events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove', 'touchend'] as any,
        onHover: (event: any, elements: any, chart: any) => {
          const c = chart?.canvas;
          if (c) {
            c.style.cursor = elements && elements.length > 0 ? 'pointer' : 'default';
          }
        },
        onClick: (event: any, elements: any, chart: any) => {
          if (elements && elements.length > 0) {
            chart.setActiveElements(elements);
            chart.tooltip?.setActiveElements(elements, {
              x: event.x ?? chart.width / 2,
              y: event.y ?? chart.height / 2,
            });
            chart.update();
          }
        },
        plugins: {
          legend: {
            display: isDonut,
            position: 'right',
            labels: {
              color: textColor,
              font: { size: isFullscreen ? 14 : 12, family: "'Plus Jakarta Sans', system-ui, sans-serif", weight: 600 },
              boxWidth: isFullscreen ? 18 : 14,
            },
          },
          tooltip: {
            enabled: true,
            mode: interactionMode,
            intersect: false,
            axis: interactionAxis,
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            titleColor: isDark ? '#ffffff' : '#0f172a',
            bodyColor: isDark ? '#93c5fd' : '#1d4ed8',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const val = typeof context.raw === 'number' ? context.raw : 0;
                return ` ${metricLabel}: ${formatNumber(val, currencySymbol)}`;
              },
            },
          },
        },
        scales: isDonut
          ? {}
          : {
              x: {
                grid: { display: false },
                ticks: {
                  color: textColor,
                  font: {
                    family: "'Plus Jakarta Sans', system-ui, sans-serif",
                    size: tickFontSize,
                    weight: 700,
                  },
                  callback: function (val: any) {
                    if (isHorizontal) {
                      return formatNumber(Number(val), currencySymbol);
                    }
                    return typeof this.getLabelForValue === 'function' ? this.getLabelForValue(val) : val;
                  },
                },
                border: { color: borderColor },
              },
              y: {
                grid: { color: gridColor },
                ticks: {
                  crossAlign: isHorizontal ? 'near' : undefined,
                  padding: isHorizontal ? 8 : 4,
                  color: textColor,
                  font: {
                    family: "'Plus Jakarta Sans', system-ui, sans-serif",
                    size: tickFontSize,
                    weight: 700,
                  },
                  callback: function (val: any) {
                    if (isHorizontal) {
                      return typeof this.getLabelForValue === 'function' ? this.getLabelForValue(val) : val;
                    }
                    return formatNumber(Number(val), currencySymbol);
                  },
                },
                border: { color: borderColor },
              },
            },
      },
    });

    chartRef.current = newChart;
    renderedThemeRef.current = theme;

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartType, data, metricLabel, currencySymbol, isFullscreen]);

  useLayoutEffect(() => {
    if (renderedThemeRef.current === theme) return;
    renderedThemeRef.current = theme;

    const chart = chartRef.current;
    if (chart) {
      const isDark = theme === 'dark';
      const textColor = isDark ? '#94a3b8' : '#334155';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
      const borderColor = isDark ? '#334155' : '#cbd5e1';

      if (chart.options.scales?.x?.ticks) chart.options.scales.x.ticks.color = textColor;
      if (chart.options.scales?.y?.ticks) chart.options.scales.y.ticks.color = textColor;
      if (chart.options.scales?.x?.grid) chart.options.scales.x.grid.color = gridColor;
      if (chart.options.scales?.y?.grid) chart.options.scales.y.grid.color = gridColor;
      if (chart.options.scales?.x?.border) chart.options.scales.x.border.color = borderColor;
      if (chart.options.scales?.y?.border) chart.options.scales.y.border.color = borderColor;

      if (chart.options.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = textColor;
      }
      if (chart.options.plugins?.tooltip) {
        chart.options.plugins.tooltip.backgroundColor = isDark ? '#0f172a' : '#ffffff';
        chart.options.plugins.tooltip.borderColor = isDark ? '#334155' : '#e2e8f0';
        chart.options.plugins.tooltip.titleColor = isDark ? '#ffffff' : '#0f172a';
        chart.options.plugins.tooltip.bodyColor = isDark ? '#cbd5e1' : '#334155';
      }

      if (chartType === 'donut' && chart.data.datasets?.[0]) {
        chart.data.datasets[0].borderColor = isDark ? '#0f172a' : '#ffffff';
      }

      chart.update('none');
    }
  }, [theme, chartType]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const ratioX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ratioY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const pos = {
      x: Math.round(ratioX * chart.width),
      y: Math.round(ratioY * chart.height),
    };

    const isHorizontal = chartType === 'horizontal-bar';
    const isDonut = chartType === 'donut';
    const mode: 'nearest' | 'index' = isDonut ? 'nearest' : 'index';
    const axis: 'x' | 'y' = isHorizontal ? 'y' : 'x';

    try {
      const elements = chart.getElementsAtEventForMode(
        pos as any,
        mode,
        { intersect: false, axis },
        false
      );
      if (elements && elements.length > 0) {
        chart.setActiveElements(elements);
        chart.tooltip?.setActiveElements(elements, pos);
        chart.update();
      }
    } catch {
      // safe fallback
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      style={{ touchAction: chartType === 'horizontal-bar' ? 'pan-y' : 'manipulation' }}
      className="w-full h-full cursor-pointer touch-manipulation"
    />
  );
}

export function PresentationModal({
  isOpen,
  onClose,
  datasetName,
  dimension,
  metric,
  chartType,
  aggregatedData,
  records,
  currencySymbol = '$',
  theme = 'light',
}: PresentationModalProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const totalSlides = 5;
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Active file name: prioritize window.activeFileName then datasetName
  const activeFileName =
    (typeof window !== 'undefined' && window.activeFileName) ||
    datasetName ||
    'Active Dataset';

  // Dynamic Key Takeaways generated by NLP semantic engine
  const takeaways = useMemo(() => {
    return generateKeyTakeaways(aggregatedData, dimension, metric, currencySymbol).slice(0, 3);
  }, [aggregatedData, dimension, metric, currencySymbol]);

  // Top 5 Performers extracted from activeDataset
  const top5Rows = useMemo(() => {
    const dataset =
      (typeof window !== 'undefined' && window.activeDataset && window.activeDataset.length > 0)
        ? window.activeDataset
        : records;

    if (!dataset || dataset.length === 0) return [];

    // Sort descending by metric value
    const sorted = [...dataset].sort((a, b) => {
      const valA =
        typeof a[metric] === 'number'
          ? a[metric]
          : parseFloat(String(a[metric] || a['Revenue (NGN)'] || a['price'] || a['Revenue NGN'] || 0).replace(/[^0-9.-]/g, '')) || 0;
      const valB =
        typeof b[metric] === 'number'
          ? b[metric]
          : parseFloat(String(b[metric] || b['Revenue (NGN)'] || b['price'] || b['Revenue NGN'] || 0).replace(/[^0-9.-]/g, '')) || 0;
      return valB - valA;
    });

    return sorted.slice(0, 5);
  }, [records, metric]);

  // Identify display columns for Top 5 table (Dimension, Metric, plus 2 contextual attributes)
  const displayColumns = useMemo(() => {
    if (!top5Rows || top5Rows.length === 0) return [dimension, metric];
    const sample = top5Rows[0];
    const candidateKeys = Object.keys(sample).filter(
      (k) =>
        k !== 'id' &&
        k !== 'orderNumber' &&
        k !== dimension &&
        k !== metric &&
        !k.startsWith('_')
    );
    return [dimension, metric, ...candidateKeys.slice(0, 2)];
  }, [top5Rows, dimension, metric]);

  // Fullscreen event listener to sync device state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        Boolean(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        )
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Toggle fullscreen mode on the device
  const toggleFullscreen = async () => {
    try {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        const elem = modalContainerRef.current;
        if (elem) {
          if (elem.requestFullscreen) {
            await elem.requestFullscreen();
          } else if ((elem as any).webkitRequestFullscreen) {
            await (elem as any).webkitRequestFullscreen();
          } else if ((elem as any).mozRequestFullScreen) {
            await (elem as any).mozRequestFullScreen();
          } else if ((elem as any).msRequestFullscreen) {
            await (elem as any).msRequestFullscreen();
          }
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request could not be completed:', err);
    }
  };

  const handleClose = async () => {
    const isCurrentlyFullscreen = Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement
    );
    if (isCurrentlyFullscreen) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      } catch {
        // ignore
      }
    }
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape' && !isFullscreen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, totalSlides, isFullscreen]);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // SLIDES ARRAY (Dynamic 5-Slide Carousel Flow)
  // -------------------------------------------------------------
  const slides = [
    // Slide 1 (Title): Vertically/horizontally centered. Main text: "Data Performance Review".
    // Subtext: window.activeFileName and new Date().toLocaleDateString().
    <div
      key="slide-1"
      className={`flex-1 flex flex-col items-center justify-center text-center ${
        isFullscreen ? 'p-12 sm:p-24' : 'p-8 sm:p-16'
      }`}
    >
      <div
        className={`${
          isFullscreen ? 'w-24 sm:w-36 h-2 sm:h-2.5 mb-8 sm:mb-12' : 'w-16 h-1.5 mb-6 sm:mb-8'
        } bg-blue-500 rounded-full transition-all duration-300`}
      />
      <h1
        className={`${
          isFullscreen
            ? 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl mb-6 sm:mb-8'
            : 'text-3xl sm:text-5xl lg:text-6xl mb-4'
        } font-extrabold tracking-tight ${
          isDark ? 'text-white' : 'text-slate-900'
        } transition-all duration-300`}
      >
        Data Performance Review
      </h1>
      <p
        className={`${
          isFullscreen ? 'text-lg sm:text-2xl lg:text-3xl font-semibold' : 'text-sm sm:text-lg lg:text-xl font-medium'
        } ${isDark ? 'text-slate-400' : 'text-slate-500'} transition-all duration-300`}
      >
        {activeFileName} • {new Date().toLocaleDateString()}
      </p>
    </div>,

    // Slide 2 (Executive Summary): Map the exact 3 Key Takeaways generated by the NLP engine as large, highly readable bullet points.
    <div
      key="slide-2"
      className={`flex-1 flex flex-col justify-center ${
        isFullscreen ? 'px-10 sm:px-20 lg:px-32 py-10 sm:py-16' : 'px-8 sm:px-16 lg:px-24 py-8'
      } overflow-y-auto`}
    >
      <div className={isFullscreen ? 'mb-8 sm:mb-12' : 'mb-6 sm:mb-8'}>
        <span
          className={`${
            isFullscreen ? 'text-sm sm:text-base tracking-widest' : 'text-xs sm:text-sm tracking-wider'
          } font-bold uppercase text-blue-500 dark:text-blue-400`}
        >
          Key Insights
        </span>
        <h2
          className={`${
            isFullscreen ? 'text-3xl sm:text-5xl lg:text-6xl mt-2' : 'text-2xl sm:text-4xl mt-1'
          } font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}
        >
          Executive Summary
        </h2>
      </div>

      <div className={`${isFullscreen ? 'space-y-6 sm:space-y-8 max-w-6xl' : 'space-y-4 sm:space-y-5 max-w-4xl'} w-full`}>
        {takeaways.map((point, idx) => (
          <div
            key={idx}
            className={`flex items-start ${
              isFullscreen
                ? 'gap-6 sm:gap-8 p-6 sm:p-8 rounded-2xl shadow-xl'
                : 'gap-4 p-4 sm:p-5 rounded-xl shadow-md'
            } ${
              isDark
                ? 'bg-slate-800/80 border border-slate-700/60'
                : 'bg-slate-50 border border-slate-200/90 shadow-xs'
            } transition-all duration-300`}
          >
            <div
              className={`${
                isFullscreen
                  ? 'w-12 h-12 sm:w-16 sm:h-16 rounded-2xl text-xl sm:text-2xl font-black'
                  : 'w-8 h-8 rounded-lg text-sm font-bold'
              } ${
                isDark
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30'
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              } flex items-center justify-center shrink-0 border`}
            >
              {idx + 1}
            </div>
            <p
              className={`${
                isFullscreen ? 'text-xl sm:text-2xl lg:text-3xl font-semibold' : 'text-base sm:text-lg lg:text-xl font-medium'
              } ${isDark ? 'text-slate-100' : 'text-slate-800'} leading-relaxed`}
            >
              {point}
            </p>
          </div>
        ))}
      </div>
    </div>,

    // Slide 3 (Visual Breakdown): Title: Dynamic "[Metric] by [Dimension]". Below it, render the active Chart.js canvas.
    <div
      key="slide-3"
      className={`flex-1 flex flex-col ${isFullscreen ? 'p-8 sm:p-14' : 'p-6 sm:p-10'} min-h-0`}
    >
      <div className="mb-4 shrink-0">
        <span
          className={`${
            isFullscreen ? 'text-sm sm:text-base tracking-widest' : 'text-xs sm:text-sm tracking-wider'
          } font-bold uppercase text-blue-500 dark:text-blue-400`}
        >
          Visual Breakdown
        </span>
        <h2
          className={`${
            isFullscreen ? 'text-2xl sm:text-4xl lg:text-5xl mt-2' : 'text-xl sm:text-3xl mt-1'
          } font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}
        >
          {metric} by {dimension}
        </h2>
      </div>

      <div
        className={`flex-1 relative w-full min-h-0 ${
          isFullscreen ? 'p-6 sm:p-8 rounded-2xl' : 'p-4 rounded-xl'
        } ${
          isDark
            ? 'bg-slate-950/40 border border-slate-800/80'
            : 'bg-slate-50/70 border border-slate-200/90'
        }`}
      >
        <SlideChartCanvas
          chartType={chartType}
          data={aggregatedData}
          metricLabel={metric}
          currencySymbol={currencySymbol}
          theme={theme}
          isFullscreen={isFullscreen}
        />
      </div>
    </div>,

    // Slide 4 (Top 5 Performers): Extract the top 5 sorted rows from activeDataset. Display in a clean, high-contrast HTML table.
    <div
      key="slide-4"
      className={`flex-1 flex flex-col ${isFullscreen ? 'p-8 sm:p-14' : 'p-6 sm:p-10'} justify-center overflow-y-auto`}
    >
      <div className={isFullscreen ? 'mb-6 sm:mb-8 shrink-0' : 'mb-5 shrink-0'}>
        <span
          className={`${
            isFullscreen ? 'text-sm sm:text-base tracking-widest' : 'text-xs sm:text-sm tracking-wider'
          } font-bold uppercase text-blue-500 dark:text-blue-400`}
        >
          Data Audit
        </span>
        <h2
          className={`${
            isFullscreen ? 'text-2xl sm:text-4xl lg:text-5xl mt-2' : 'text-xl sm:text-3xl mt-1'
          } font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}
        >
          Top 5 Performers
        </h2>
      </div>

      <div
        className={`overflow-x-auto ${
          isFullscreen ? 'rounded-2xl shadow-2xl max-w-6xl mx-auto w-full' : 'rounded-xl shadow-xl w-full'
        } border ${isDark ? 'border-slate-700/70 bg-slate-950/60' : 'border-slate-200 bg-white'}`}
      >
        <table className={`w-full text-left ${isFullscreen ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'} border-collapse`}>
          <thead>
            <tr
              className={`${
                isDark ? 'bg-slate-800/90 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
              } border-b`}
            >
              <th
                className={`${
                  isFullscreen ? 'py-4 px-6 text-center w-20 font-bold' : 'py-3 px-4 text-center w-16 font-bold'
                }`}
              >
                Rank
              </th>
              {displayColumns.map((col) => (
                <th
                  key={col}
                  className={`${
                    isFullscreen ? 'py-4 px-6 font-bold capitalize' : 'py-3 px-4 font-bold capitalize'
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
            {top5Rows.map((row, i) => {
              const rankColor = isDark
                ? i === 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : i === 1
                  ? 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                  : i === 2
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : i === 0
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : i === 1
                ? 'bg-slate-100 text-slate-800 border-slate-300'
                : i === 2
                ? 'bg-orange-100 text-orange-800 border-orange-300'
                : 'bg-blue-100 text-blue-800 border-blue-300';

              return (
                <tr
                  key={i}
                  className={`transition-colors ${
                    isDark
                      ? 'hover:bg-slate-800/50 odd:bg-slate-900/30 even:bg-slate-850/50'
                      : 'hover:bg-slate-50 odd:bg-white even:bg-slate-50/70'
                  }`}
                >
                  <td className={`${isFullscreen ? 'py-4 px-6 text-center' : 'py-3 px-4 text-center'}`}>
                    <span
                      className={`inline-block ${
                        isFullscreen ? 'px-3.5 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'
                      } font-bold rounded-full border ${rankColor}`}
                    >
                      #{i + 1}
                    </span>
                  </td>
                  {displayColumns.map((col) => {
                    const rawVal = row[col];
                    const isMetricCol = col === metric;
                    const formatted =
                      isMetricCol && typeof rawVal === 'number'
                        ? formatNumber(rawVal, currencySymbol)
                        : String(rawVal ?? '-');

                    return (
                      <td
                        key={col}
                        className={`${isFullscreen ? 'py-4 px-6' : 'py-3 px-4'} ${
                          isMetricCol
                            ? isDark
                              ? 'font-bold text-emerald-400 font-mono'
                              : 'font-bold text-emerald-600 font-mono'
                            : col === dimension
                            ? isDark
                              ? 'font-semibold text-white'
                              : 'font-semibold text-slate-900'
                            : isDark
                            ? 'text-slate-300'
                            : 'text-slate-600'
                        }`}
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>,

    // Slide 5 (Closing): Center the text "Questions?" with a large "?" icon next to it.
    <div
      key="slide-5"
      className={`flex-1 flex flex-col items-center justify-center ${
        isFullscreen ? 'p-12 sm:p-24' : 'p-8 sm:p-16'
      }`}
    >
      <div className={`flex items-center ${isFullscreen ? 'gap-8 sm:gap-12' : 'gap-5 sm:gap-8'}`}>
        <div
          className={`${
            isFullscreen ? 'w-24 h-24 sm:w-36 sm:h-36 rounded-3xl' : 'w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl'
          } ${
            isDark ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
          } border flex items-center justify-center shadow-2xl transition-all duration-300`}
        >
          <HelpCircle
            className={`${isFullscreen ? 'w-14 h-14 sm:w-22 sm:h-22' : 'w-10 h-10 sm:w-16 sm:h-16'} stroke-[2]`}
          />
        </div>
        <h1
          className={`${
            isFullscreen ? 'text-5xl sm:text-7xl lg:text-9xl' : 'text-4xl sm:text-6xl lg:text-7xl'
          } font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} transition-all duration-300`}
        >
          Questions?
        </h1>
      </div>
    </div>,
  ];

  return (
    <div
      ref={modalContainerRef}
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isDark ? 'bg-black/95' : 'bg-slate-950/60'
      } backdrop-blur-md ${isFullscreen ? 'p-0' : 'p-4 lg:p-12'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFullscreen) handleClose();
      }}
    >
      {/* The inner presentation slide */}
      <div
        className={`w-full ${
          isFullscreen
            ? 'h-full max-w-none rounded-none border-0'
            : 'max-w-7xl aspect-video rounded-2xl border shadow-2xl'
        } ${
          isDark ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200'
        } flex flex-col relative overflow-hidden transition-all duration-200`}
      >
        {/* Float "Expand / Fullscreen" and "Close (X)" buttons cleanly in top-right corner */}
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-2 ${
              isDark
                ? 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/60'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
            } border rounded-lg transition-colors cursor-pointer`}
            title={isFullscreen ? 'Exit full screen (Esc)' : 'Expand to full screen'}
            aria-label={isFullscreen ? 'Exit full screen' : 'Expand to full screen'}
          >
            {isFullscreen ? (
              <Minimize2 className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            ) : (
              <Maximize2 className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
            )}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className={`p-2 ${
              isDark
                ? 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/60'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
            } border rounded-lg transition-colors cursor-pointer`}
            title="Close presentation (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Carousel Previous Chevron (Floating Left) */}
        {currentSlideIndex > 0 && (
          <button
            type="button"
            onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
            className={`absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 ${
              isFullscreen ? 'p-3.5 sm:p-4' : 'p-2 sm:p-2.5'
            } rounded-full ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200 shadow-md'
            } border shadow-lg transition-all cursor-pointer`}
            title="Previous slide (Left Arrow)"
          >
            <ChevronLeft className={isFullscreen ? 'w-6 h-6' : 'w-5 h-5'} />
          </button>
        )}

        {/* Carousel Next Chevron (Floating Right) */}
        {currentSlideIndex < totalSlides - 1 && (
          <button
            type="button"
            onClick={() =>
              setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1))
            }
            className={`absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 ${
              isFullscreen ? 'p-3.5 sm:p-4' : 'p-2 sm:p-2.5'
            } rounded-full ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200 shadow-md'
            } border shadow-lg transition-all cursor-pointer`}
            title="Next slide (Right Arrow)"
          >
            <ChevronRight className={isFullscreen ? 'w-6 h-6' : 'w-5 h-5'} />
          </button>
        )}

        {/* Active Slide Content */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {slides[currentSlideIndex]}
        </div>

        {/* Bottom Slide Indicator / Dots Navigation */}
        <div
          className={`${
            isFullscreen ? 'py-4 px-8 text-sm' : 'py-3 px-6 text-xs'
          } border-t ${
            isDark ? 'border-slate-800/80 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50/90 text-slate-500'
          } flex items-center justify-between shrink-0`}
        >
          <span className="font-mono">
            Slide {currentSlideIndex + 1} of {totalSlides}
          </span>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlideIndex(idx)}
                className={`rounded-full transition-all cursor-pointer ${
                  isFullscreen ? 'h-2' : 'h-1.5'
                } ${
                  currentSlideIndex === idx
                    ? `${isFullscreen ? 'w-8' : 'w-6'} bg-blue-500`
                    : `${isFullscreen ? 'w-3' : 'w-2'} ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-300 hover:bg-slate-400'}`
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <span className="hidden sm:inline text-[11px] opacity-75">
            Use ← → arrows to navigate
          </span>
        </div>
      </div>
    </div>
  );
}
