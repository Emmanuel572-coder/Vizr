import React, { useEffect, useLayoutEffect, useRef, memo } from 'react';
import Chart from 'chart.js/auto';
import type { ChartData, ChartOptions } from 'chart.js';
import { AggregatedDataPoint } from '../types';
import { formatNumber, formatAxisTick } from '../utils/currencyEngine';
import { getDistinctDonutColor } from '../utils/analytics';

// Accurate Pointer & Touch Plugin:
// Recalculates canvas event coordinates relative to the canvas bounding rect.
// This guarantees 100% pixel-perfect hover and click accuracy across any CSS zoom (such as zoom: 0.85),
// CSS scale transforms, retina display pixel ratios, and mobile/tablet touch screens.
const accurateInteractionPlugin = {
  id: 'accurateInteractionPlugin',
  beforeEvent(chart: any, args: { event: any; inChartArea: boolean }) {
    const e = args.event;
    const native = e.native;
    if (!native) return;

    // Clean mouseout: let Chart.js clear active elements naturally when cursor leaves canvas
    if (e.type === 'mouseout' || native.type === 'mouseout' || native.type === 'mouseleave') {
      return;
    }

    const canvas = chart.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    let clientX: number | undefined;
    let clientY: number | undefined;

    if (native.touches && native.touches.length > 0) {
      clientX = native.touches[0].clientX;
      clientY = native.touches[0].clientY;
    } else if (native.changedTouches && native.changedTouches.length > 0) {
      clientX = native.changedTouches[0].clientX;
      clientY = native.changedTouches[0].clientY;
    } else if (native.clientX !== undefined && native.clientY !== undefined) {
      clientX = native.clientX;
      clientY = native.clientY;
    }

    if (clientX === undefined || clientY === undefined) return;

    // Viewport-relative ratio: invariant to browser CSS zoom, DPR, or transforms
    const ratioX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const ratioY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    e.x = Math.round(ratioX * chart.width);
    e.y = Math.round(ratioY * chart.height);

    // Treat active canvas interaction as in-bounds so bars, line points, and pie slices at edges are always responsive
    args.inChartArea = true;
  },
};

// Register plugin globally with Chart.js
Chart.register(accurateInteractionPlugin);

interface ChartJsVisualizerProps {
  key?: string | number;
  chartType: 'bar' | 'horizontal-bar' | 'line' | 'donut' | 'pie';
  data: AggregatedDataPoint[];
  metricLabel: string;
  isCurrency?: boolean;
  theme?: 'light' | 'dark';
}

// Primary UI Accent Color: Deep Blue for Bar and Line charts
const PRIMARY_DEEP_BLUE = '#1d4ed8'; // Tailwind Blue 700 / rgb(29, 78, 216)

// Constants for virtualized large-dataset rendering
const ITEM_HEIGHT = 38;
const ITEM_WIDTH = 40;
const BUFFER_COUNT = 10;
const VIEWPORT_HEIGHT = 480;

function measureMaxLabelWidth(allLabels: string[]): number {
  if (typeof document === 'undefined' || allLabels.length === 0) return 110;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 110;
    ctx.font = '700 11px "Plus Jakarta Sans", system-ui, sans-serif';
    let maxW = 0;
    const step = Math.max(1, Math.floor(allLabels.length / 100));
    for (let i = 0; i < allLabels.length; i += step) {
      const w = ctx.measureText(String(allLabels[i] ?? '')).width;
      if (w > maxW) maxW = w;
    }
    let longest = '';
    for (let i = 0; i < allLabels.length; i++) {
      const s = String(allLabels[i] ?? '');
      if (s.length > longest.length) longest = s;
    }
    const longW = ctx.measureText(longest).width;
    if (longW > maxW) maxW = longW;

    const screenCap =
      typeof window !== 'undefined' && window.innerWidth < 640
        ? Math.floor(window.innerWidth * 0.38)
        : 220;

    return Math.min(Math.max(Math.ceil(maxW + 18), 65), Math.max(65, screenCap));
  } catch {
    return 110;
  }
}

function measureMaxFigureWidth(maxVal: number, isCurrency: boolean, symbol: string): number {
  if (typeof document === 'undefined') return 60;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 60;
    ctx.font = '700 11px "Plus Jakarta Sans", system-ui, sans-serif';
    const formatted = formatAxisTick(maxVal, isCurrency ? symbol : null);
    const w = ctx.measureText(formatted).width;
    return Math.min(Math.max(Math.ceil(w + 14), 54), 110);
  } catch {
    return 60;
  }
}

export const ChartJsVisualizer = memo(function ChartJsVisualizer({
  chartType,
  data,
  metricLabel,
  isCurrency = true,
  theme = 'light',
}: ChartJsVisualizerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dataCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const axisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const axisChartInstanceRef = useRef<Chart | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sliceWrapperRef = useRef<HTMLDivElement | null>(null);
  const lastStartIndexRef = useRef<number>(-1);
  const rafIdRef = useRef<number | null>(null);
  const renderedThemeRef = useRef(theme);

  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#334155';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
  const tooltipTitle = isDark ? '#ffffff' : '#0f172a';
  const tooltipBody = isDark ? '#cbd5e1' : '#334155';

  const currencySymbol =
    metricLabel.includes('NGN') || metricLabel.includes('₦') || metricLabel.includes('(₦)')
      ? '₦'
      : '$';

  const effectiveIsCurrency =
    isCurrency ||
    metricLabel.includes('$') ||
    metricLabel.includes('₦') ||
    metricLabel.includes('($)') ||
    metricLabel.includes('(₦)');

  // 1. Calculate the Threshold:
  // Count the data points: const itemCount = dataValues.length;
  // Define the threshold: const SCROLL_THRESHOLD = 50;
  const labels = (data || []).map((d) => d.displayName || d.name);
  const values = (data || []).map((d) => d.value ?? d.revenue ?? 0);
  const dataValues = values;
  const itemCount = dataValues.length;
  const SCROLL_THRESHOLD = 50;

  const isHorizontal = chartType === 'horizontal-bar';
  const isDonut = chartType === 'donut';
  const isPie = chartType === 'pie';
  const isLine = chartType === 'line';

  // Compute maximum individual value for synchronized axis scaling
  const maxVal = Math.max(...values.map((v) => Number(v) || 0));
  const globalMax = maxVal > 0 ? maxVal : 1;

  // Measure exact widths needed for seamless scale and label alignment
  const syncYWidth = measureMaxLabelWidth(labels);
  const yAxisWidth = measureMaxFigureWidth(globalMax, effectiveIsCurrency, currencySymbol);

  // Standard comfortable height for Mode A charts:
  // For datasets having <= 10 items in horizontal view, scale container height dynamically
  // so bars stay comfortably grouped with subtle, balanced spacing rather than stretching across 480px.
  const isSmallItemCount = itemCount <= 10;
  const modeAHeight = isHorizontal && isSmallItemCount
    ? Math.max(180, Math.min(440, itemCount * 38 + 40))
    : 480;

  // Safe device pixel ratio cap to prevent GPU out-of-memory on Retina/4K displays
  const safeDpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

  // High-performance virtualized scroll handler using requestAnimationFrame
  const handleScroll = () => {
    if (rafIdRef.current) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const container = scrollContainerRef.current;
      if (!container) return;

      if (isHorizontal) {
        const scrollTop = container.scrollTop;
        const rawStart = Math.floor(scrollTop / ITEM_HEIGHT);
        const startIndex = Math.max(0, rawStart - BUFFER_COUNT);
        if (startIndex === lastStartIndexRef.current) return;
        lastStartIndexRef.current = startIndex;

        const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT);
        const endIndex = Math.min(itemCount, rawStart + visibleCount + BUFFER_COUNT);
        const sliceLabels = labels.slice(startIndex, endIndex);
        const sliceValues = values.slice(startIndex, endIndex);
        const offsetY = startIndex * ITEM_HEIGHT;
        const sliceHeight = (endIndex - startIndex) * ITEM_HEIGHT;

        if (sliceWrapperRef.current) {
          sliceWrapperRef.current.style.transform = `translateY(${offsetY}px)`;
          sliceWrapperRef.current.style.height = `${sliceHeight}px`;
        }

        if (dataCanvasRef.current) {
          dataCanvasRef.current.style.height = `${sliceHeight}px`;
        }

        if (chartInstanceRef.current) {
          chartInstanceRef.current.data.labels = sliceLabels;
          chartInstanceRef.current.data.datasets[0].data = sliceValues;
          chartInstanceRef.current.update('none');
        }
      } else {
        const scrollLeft = container.scrollLeft;
        const rawStart = Math.floor(scrollLeft / ITEM_WIDTH);
        const startIndex = Math.max(0, rawStart - BUFFER_COUNT);
        if (startIndex === lastStartIndexRef.current) return;
        lastStartIndexRef.current = startIndex;

        const viewportWidth = container.clientWidth || 800;
        const visibleCount = Math.ceil(viewportWidth / ITEM_WIDTH);
        const endIndex = Math.min(itemCount, rawStart + visibleCount + BUFFER_COUNT);
        const sliceLabels = labels.slice(startIndex, endIndex);
        const sliceValues = values.slice(startIndex, endIndex);
        const offsetX = startIndex * ITEM_WIDTH;
        const sliceWidth = (endIndex - startIndex) * ITEM_WIDTH;

        if (sliceWrapperRef.current) {
          sliceWrapperRef.current.style.transform = `translateX(${offsetX}px)`;
          sliceWrapperRef.current.style.width = `${sliceWidth}px`;
        }

        if (dataCanvasRef.current) {
          dataCanvasRef.current.style.width = `${sliceWidth}px`;
        }

        if (chartInstanceRef.current) {
          chartInstanceRef.current.data.labels = sliceLabels;
          chartInstanceRef.current.data.datasets[0].data = sliceValues;
          chartInstanceRef.current.update('none');
        }
      }
    });
  };

  const renderChart = () => {
    // Dynamic DOM Reset:
    // Reset container styles before applying Mode A or Mode B layout
    if (containerRef.current) {
      containerRef.current.style.overflow = '';
      containerRef.current.style.overflowX = '';
      containerRef.current.style.overflowY = '';
      containerRef.current.style.width = '';
      containerRef.current.style.maxWidth = '';
      containerRef.current.style.height = itemCount < SCROLL_THRESHOLD ? `${modeAHeight}px` : '';
      containerRef.current.style.maxHeight = '';
      containerRef.current.style.minHeight = '';
    }

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      scrollContainerRef.current.scrollLeft = 0;
    }

    lastStartIndexRef.current = 0;

    // Destroy any global Chart.js instance to prevent canvas ghosting and memory leaks
    if (typeof window !== 'undefined' && window.activeChartInstance) {
      try {
        window.activeChartInstance.destroy();
      } catch {
        // Ignore transient destroy errors
      }
      window.activeChartInstance = null;
    }

    if (dataCanvasRef.current) {
      const existing = Chart.getChart(dataCanvasRef.current);
      if (existing) existing.destroy();
    }
    if (axisCanvasRef.current) {
      const existingAxis = Chart.getChart(axisCanvasRef.current);
      if (existingAxis) existingAxis.destroy();
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }
    if (axisChartInstanceRef.current) {
      axisChartInstanceRef.current.destroy();
      axisChartInstanceRef.current = null;
    }

    if (!data || data.length === 0 || !dataCanvasRef.current) return;

    // Shared interaction configuration
    const interactionMode: 'nearest' | 'index' = isDonut || isPie ? 'nearest' : 'index';
    const interactionAxis: 'x' | 'y' | 'xy' = isDonut || isPie ? 'xy' : isHorizontal ? 'y' : 'x';

    const sharedInteractionConfig = {
      mode: interactionMode,
      intersect: false,
      axis: interactionAxis,
    };

    // Shared tooltip configuration
    const tooltipConfig = {
      enabled: true,
      mode: interactionMode,
      intersect: false,
      axis: interactionAxis,
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      borderWidth: 1,
      padding: 12,
      boxPadding: 6,
      titleColor: tooltipTitle,
      bodyColor: tooltipBody,
      titleFont: {
        family: "'Plus Jakarta Sans', system-ui, sans-serif",
        size: 12,
        weight: 700,
      },
      bodyFont: {
        family: "'Plus Jakarta Sans', system-ui, sans-serif",
        size: 12,
      },
      callbacks: {
        label: (context: any) => {
          const val =
            context.parsed.y !== undefined && !isHorizontal
              ? context.parsed.y
              : context.parsed.x !== undefined && isHorizontal
              ? context.parsed.x
              : context.parsed;

          const formattedVal = formatNumber(Number(val), effectiveIsCurrency ? currencySymbol : null);

          if (isDonut || isPie) {
            const dataArr = (context.dataset.data as number[]) || [];
            const total = dataArr.reduce((sum, v) => sum + (Number(v) || 0), 0);
            const pct = total > 0 ? ((Number(val) / total) * 100).toFixed(1) : '0.0';
            return ` ${context.label || ''}: ${formattedVal} (${pct}%)`;
          }

          return ` ${context.dataset.label || metricLabel}: ${formattedVal}`;
        },
      },
    };

    const sharedChartEvents = [
      'mousemove',
      'mouseout',
      'click',
      'touchstart',
      'touchmove',
      'touchend',
      'pointerdown',
      'pointermove',
    ] as any;

    const sharedOnHover = (event: any, elements: any, chart: any) => {
      const c = chart?.canvas;
      if (c) {
        c.style.cursor = elements && elements.length > 0 ? 'pointer' : 'default';
      }
    };

    const sharedOnClick = (event: any, elements: any, chart: any) => {
      if (elements && elements.length > 0) {
        chart.setActiveElements(elements);
        chart.tooltip?.setActiveElements(elements, {
          x: event.x ?? chart.width / 2,
          y: event.y ?? chart.height / 2,
        });
        chart.update();
      }
    };

    // -------------------------------------------------------------------------
    // 2. HORIZONTAL CHART ARCHITECTURE (>= 50 ITEMS)
    // Synchronized dual-canvas layout with virtualized rendering
    // -------------------------------------------------------------------------
    if (itemCount >= SCROLL_THRESHOLD && isHorizontal && axisCanvasRef.current) {
      const initEndIndex = Math.min(itemCount, Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT) + BUFFER_COUNT * 2);
      const initialSliceLabels = labels.slice(0, initEndIndex);
      const initialSliceValues = values.slice(0, initEndIndex);

      // Header (Sticky Top): Canvas A
      const axisChart = new Chart(axisCanvasRef.current, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          devicePixelRatio: safeDpr,
          animation: false,
          layout: {
            padding: { left: 4, right: 16, top: 6, bottom: 2 },
          },
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
          },
          scales: {
            x: {
              type: 'linear',
              position: 'top',
              beginAtZero: true,
              min: 0,
              max: globalMax,
              grid: { display: false },
              border: { display: false },
              afterFit: (scaleInstance) => {
                scaleInstance.height = 34;
                (scaleInstance as any)._computeLabelArea = () => ({
                  top: 0,
                  left: 0,
                  bottom: scaleInstance.chart.height,
                  right: scaleInstance.chart.width,
                });
              },
              ticks: {
                display: true,
                color: textColor,
                font: {
                  family: "'Plus Jakarta Sans', system-ui, sans-serif",
                  size: 11,
                  weight: 700,
                },
                autoSkip: true,
                autoSkipPadding: 20,
                maxTicksLimit: 6,
                padding: 4,
                callback: function (val: any) {
                  return formatAxisTick(Number(val), effectiveIsCurrency ? currencySymbol : null);
                },
              },
            },
            y: {
              type: 'category',
              display: true,
              position: 'left',
              grid: { display: false },
              border: { display: false },
              afterFit: (scaleInstance) => {
                scaleInstance.width = syncYWidth;
              },
              ticks: { display: false },
            },
          },
        },
      });
      axisChartInstanceRef.current = axisChart;

      // Body (Scrollable): Canvas B
      const dataChart = new Chart(dataCanvasRef.current, {
        type: 'bar',
        data: {
          labels: initialSliceLabels,
          datasets: [
            {
              label: metricLabel,
              data: initialSliceValues,
              backgroundColor: PRIMARY_DEEP_BLUE,
              hoverBackgroundColor: '#1e40af',
              borderColor: PRIMARY_DEEP_BLUE,
              hoverBorderColor: '#60a5fa',
              borderWidth: 0,
              hoverBorderWidth: 2,
              borderRadius: 6,
              barPercentage: 0.65,
              categoryPercentage: 0.85,
              maxBarThickness: 24,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          devicePixelRatio: safeDpr,
          animation: { duration: 250 },
          interaction: sharedInteractionConfig,
          hover: sharedInteractionConfig,
          events: sharedChartEvents,
          onHover: sharedOnHover,
          onClick: sharedOnClick,
          layout: {
            padding: { left: 4, right: 16, top: 4, bottom: 4 },
          },
          plugins: {
            legend: { display: false },
            tooltip: tooltipConfig,
          },
          scales: {
            x: {
              type: 'linear',
              display: false,
              beginAtZero: true,
              min: 0,
              max: globalMax,
              border: { display: false },
              grid: { display: false },
            },
            y: {
              type: 'category',
              display: true,
              position: 'left',
              grid: { display: false },
              border: { display: false },
              afterFit: (scaleInstance) => {
                scaleInstance.width = syncYWidth;
              },
              ticks: {
                crossAlign: 'near',
                align: 'end',
                padding: 8,
                color: textColor,
                font: {
                  family: "'Plus Jakarta Sans', system-ui, sans-serif",
                  size: 11,
                  weight: 700,
                },
                callback: function (val: any) {
                  return typeof this.getLabelForValue === 'function' ? this.getLabelForValue(val) : val;
                },
              },
            },
          },
        },
      });

      chartInstanceRef.current = dataChart;
      if (typeof window !== 'undefined') {
        window.activeChartInstance = dataChart;
      }
    }
    // -------------------------------------------------------------------------
    // 3. BAR CHART ARCHITECTURE (>= 50 ITEMS)
    // Synchronized dual-canvas layout with virtualized rendering
    // -------------------------------------------------------------------------
    else if (itemCount >= SCROLL_THRESHOLD && !isHorizontal && !isDonut && !isPie && axisCanvasRef.current) {
      const initEndIndex = Math.min(itemCount, 25 + BUFFER_COUNT * 2);
      const initialSliceLabels = labels.slice(0, initEndIndex);
      const initialSliceValues = values.slice(0, initEndIndex);

      // Sidebar (Sticky Left): Canvas A
      const axisChart = new Chart(axisCanvasRef.current, {
        type: isLine ? 'line' : 'bar',
        data: {
          labels: initialSliceLabels,
          datasets: [
            {
              label: metricLabel,
              data: initialSliceValues,
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'x',
          devicePixelRatio: safeDpr,
          animation: false,
          layout: {
            padding: { left: 4, right: 2, top: 8, bottom: 8 },
          },
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
          },
          scales: {
            y: {
              display: true,
              beginAtZero: true,
              min: 0,
              max: globalMax,
              position: 'left',
              grid: { display: false },
              border: { display: false },
              afterFit: (scaleInstance) => {
                scaleInstance.width = yAxisWidth;
              },
              ticks: {
                color: textColor,
                font: {
                  family: "'Plus Jakarta Sans', system-ui, sans-serif",
                  size: 11,
                  weight: 700,
                },
                autoSkip: true,
                autoSkipPadding: 16,
                maxTicksLimit: 8,
                padding: 4,
                callback: function (val: any) {
                  return formatAxisTick(Number(val), effectiveIsCurrency ? currencySymbol : null);
                },
              },
            },
            x: {
              display: true,
              grid: { display: false },
              border: { display: false },
              ticks: {
                color: 'transparent',
                maxRotation: 45,
                minRotation: 0,
                font: {
                  family: "'Plus Jakarta Sans', system-ui, sans-serif",
                  size: 11,
                  weight: 700,
                },
              },
            },
          },
        },
      });
      axisChartInstanceRef.current = axisChart;

      // Body (Scrollable): Canvas B
      const dataChart = new Chart(dataCanvasRef.current, {
        type: isLine ? 'line' : 'bar',
        data: {
          labels: initialSliceLabels,
          datasets: [
            {
              label: metricLabel,
              data: initialSliceValues,
              backgroundColor: isLine ? 'rgba(29, 78, 216, 0.10)' : PRIMARY_DEEP_BLUE,
              hoverBackgroundColor: isLine ? 'rgba(37, 99, 235, 0.22)' : '#1e40af',
              borderColor: PRIMARY_DEEP_BLUE,
              hoverBorderColor: isLine ? '#1d4ed8' : '#60a5fa',
              borderWidth: isLine ? 2.5 : 0,
              hoverBorderWidth: isLine ? 3 : 2,
              borderRadius: isLine ? 0 : 6,
              fill: isLine,
              tension: 0.35,
              pointBackgroundColor: PRIMARY_DEEP_BLUE,
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 8,
              pointHitRadius: 28,
              pointHoverBackgroundColor: '#1e40af',
              pointHoverBorderColor: '#93c5fd',
              pointHoverBorderWidth: 3,
              barPercentage: 0.68,
              categoryPercentage: 0.85,
              maxBarThickness: 36,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'x',
          devicePixelRatio: safeDpr,
          animation: { duration: 250 },
          interaction: sharedInteractionConfig,
          hover: sharedInteractionConfig,
          events: sharedChartEvents,
          onHover: sharedOnHover,
          onClick: sharedOnClick,
          layout: {
            padding: { left: 4, right: 16, top: 8, bottom: 8 },
          },
          plugins: {
            legend: { display: false },
            tooltip: tooltipConfig,
          },
          scales: {
            y: {
              display: false,
              beginAtZero: true,
              min: 0,
              max: globalMax,
              grid: { display: false },
              border: { display: false },
            },
            x: {
              display: true,
              grid: { display: false },
              border: { display: false },
              ticks: {
                color: textColor,
                font: {
                  family: "'Plus Jakarta Sans', system-ui, sans-serif",
                  size: 11,
                  weight: 700,
                },
                maxRotation: 45,
                minRotation: 0,
                padding: 2,
                callback: function (val: any) {
                  return typeof this.getLabelForValue === 'function' ? this.getLabelForValue(val) : val;
                },
              },
            },
          },
        },
      });
      chartInstanceRef.current = dataChart;
      if (typeof window !== 'undefined') {
        window.activeChartInstance = dataChart;
      }
    }
    // -------------------------------------------------------------------------
    // MODE A: STANDARD RESPONSIVE VIEW (Under 50 Items or Donut / Pie)
    // Completely disable all scrollable containers (overflow: hidden).
    // Do NOT use the split-canvas sticky axis pattern.
    // Set the canvas container to standard responsive dimensions.
    // -------------------------------------------------------------------------
    else {
      let jsChartType: 'bar' | 'line' | 'doughnut' | 'pie' = 'bar';
      if (isLine) jsChartType = 'line';
      else if (isDonut) jsChartType = 'doughnut';
      else if (isPie) jsChartType = 'pie';

      let backgroundColor: any = PRIMARY_DEEP_BLUE;
      let borderColor: any = PRIMARY_DEEP_BLUE;

      if (isDonut || isPie) {
        backgroundColor = labels.map((_, idx) => getDistinctDonutColor(idx));
        borderColor = isDark ? '#0f172a' : '#ffffff';
      } else if (isLine) {
        backgroundColor = 'rgba(29, 78, 216, 0.10)';
        borderColor = PRIMARY_DEEP_BLUE;
      }

      const chartData: ChartData<any> = {
        labels,
        datasets: [
          {
            label: metricLabel,
            data: values,
            backgroundColor,
            hoverBackgroundColor: isDonut || isPie ? undefined : (isLine ? 'rgba(37, 99, 235, 0.22)' : '#1e40af'),
            borderColor,
            hoverBorderColor: isDonut || isPie ? (isDark ? '#f8fafc' : '#0f172a') : (isLine ? '#1d4ed8' : '#60a5fa'),
            borderWidth: isLine ? 2.5 : isDonut || isPie ? 2.5 : 0,
            hoverBorderWidth: isDonut || isPie ? 3 : 2,
            borderRadius: isHorizontal ? 4 : (jsChartType === 'bar' ? 6 : 0),
            hoverOffset: isDonut || isPie ? 12 : 0,
            fill: isLine,
            tension: 0.35,
            pointBackgroundColor: PRIMARY_DEEP_BLUE,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointHitRadius: 28,
            pointHoverBackgroundColor: '#1e40af',
            pointHoverBorderColor: '#93c5fd',
            pointHoverBorderWidth: 3,
            barPercentage: isHorizontal
              ? (isSmallItemCount ? 0.80 : 0.72)
              : (isSmallItemCount ? 0.80 : 0.68),
            categoryPercentage: 0.82,
            maxBarThickness: isHorizontal
              ? (isSmallItemCount ? 28 : 20)
              : (isSmallItemCount ? 52 : 36),
          },
        ],
      };

      const options: ChartOptions<any> = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: isHorizontal ? 'y' : 'x',
        devicePixelRatio: safeDpr,
        cutout: isDonut ? '65%' : undefined,
        animation: {
          duration: 200,
          easing: 'easeOutQuart',
        },
        interaction: sharedInteractionConfig,
        hover: sharedInteractionConfig,
        events: sharedChartEvents,
        onHover: sharedOnHover,
        onClick: sharedOnClick,
        layout: {
          padding: {
            left: 4,
            right: isHorizontal ? 20 : 16,
            top: isHorizontal ? 14 : 8,
            bottom: 8,
          },
        },
        plugins: {
          legend: {
            display: isDonut || isPie,
            position: 'right',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
              padding: 12,
              color: textColor,
              font: {
                family: "'Plus Jakarta Sans', system-ui, sans-serif",
                size: 11,
                weight: 600,
              },
            },
          },
          tooltip: tooltipConfig,
        },
        scales:
          isDonut || isPie
            ? {}
            : {
                x: {
                  position: isHorizontal ? ('top' as const) : undefined,
                  beginAtZero: isHorizontal,
                  grid: { display: false },
                  border: { display: false },
                  ticks: {
                    display: true,
                    color: textColor,
                    font: {
                      family: "'Plus Jakarta Sans', system-ui, sans-serif",
                      size: 11,
                      weight: 700,
                    },
                    maxRotation: isHorizontal ? 0 : 45,
                    minRotation: 0,
                    autoSkip: isLine || isHorizontal,
                    autoSkipPadding: isHorizontal ? 20 : 8,
                    maxTicksLimit: isHorizontal ? 6 : isLine ? 15 : undefined,
                    padding: isHorizontal ? 4 : 2,
                    callback: function (val: any) {
                      if (isHorizontal) {
                        return formatAxisTick(Number(val), effectiveIsCurrency ? currencySymbol : null);
                      }
                      return typeof this.getLabelForValue === 'function' ? this.getLabelForValue(val) : val;
                    },
                  },
                },
                y: {
                  beginAtZero: !isHorizontal,
                  grid: { display: false },
                  border: { display: false },
                  ticks: {
                    crossAlign: isHorizontal ? 'near' : undefined,
                    align: isHorizontal ? 'end' : undefined,
                    padding: isHorizontal ? 10 : 4,
                    color: textColor,
                    font: {
                      family: "'Plus Jakarta Sans', system-ui, sans-serif",
                      size: isHorizontal && itemCount > 20 ? 10 : 11,
                      weight: 600,
                    },
                    autoSkip: !isHorizontal,
                    autoSkipPadding: 12,
                    maxTicksLimit: !isHorizontal ? 8 : undefined,
                    callback: function (val: any) {
                      if (isHorizontal) {
                        return typeof this.getLabelForValue === 'function' ? this.getLabelForValue(val) : val;
                      }
                      return formatAxisTick(Number(val), effectiveIsCurrency ? currencySymbol : null);
                    },
                  },
                },
              },
      };

      const newInstance = new Chart(dataCanvasRef.current, {
        type: jsChartType,
        data: chartData,
        options,
      });
      chartInstanceRef.current = newInstance;
      if (typeof window !== 'undefined') {
        window.activeChartInstance = newInstance;
      }
    }
    renderedThemeRef.current = theme;
  };

  // Structural render effect: only recreates chart instances when data or chart dimensions/types change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).visualizerRenderChart = renderChart;
    }
    renderChart();

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      if (axisChartInstanceRef.current) {
        axisChartInstanceRef.current.destroy();
        axisChartInstanceRef.current = null;
      }
      if (typeof window !== 'undefined' && window.activeChartInstance === chartInstanceRef.current) {
        window.activeChartInstance = null;
      }
    };
  }, [
    chartType,
    data,
    metricLabel,
    isCurrency,
    currencySymbol,
    isHorizontal,
    isDonut,
    isPie,
    isLine,
    itemCount,
  ]);

  // Synchronous, zero-latency theme updater:
  // Dynamically updates colors on existing chart instances in-place without destroying canvases,
  // preserving active scroll offsets, virtualized slices, and avoiding jarring re-animations
  // for both small datasets and large dataset uploads.
  useLayoutEffect(() => {
    if (renderedThemeRef.current === theme) return;
    renderedThemeRef.current = theme;

    const chart = chartInstanceRef.current;
    const axisChart = axisChartInstanceRef.current;

    if (chart) {
      // 1. Tooltip colors
      if (chart.options.plugins?.tooltip) {
        chart.options.plugins.tooltip.backgroundColor = tooltipBg;
        chart.options.plugins.tooltip.borderColor = tooltipBorder;
        chart.options.plugins.tooltip.titleColor = tooltipTitle;
        chart.options.plugins.tooltip.bodyColor = tooltipBody;
      }

      // 2. Legend color (for donut/pie)
      if (chart.options.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = textColor;
      }

      // 3. Scales tick colors
      if (chart.options.scales) {
        if (chart.options.scales.x?.ticks) {
          chart.options.scales.x.ticks.color = textColor;
        }
        if (chart.options.scales.y?.ticks && chart.options.scales.y.ticks.display !== false) {
          chart.options.scales.y.ticks.color = textColor;
        }
      }

      // 4. Donut/Pie dataset border colors
      if (isDonut || isPie) {
        if (chart.data.datasets && chart.data.datasets[0]) {
          chart.data.datasets[0].borderColor = isDark ? '#0f172a' : '#ffffff';
          chart.data.datasets[0].hoverBorderColor = isDark ? '#f8fafc' : '#0f172a';
        }
      }

      // Smooth in-place redraw without resetting animations or layout
      chart.update('none');
    }

    if (axisChart) {
      if (axisChart.options.scales) {
        if (axisChart.options.scales.x?.ticks) {
          axisChart.options.scales.x.ticks.color = textColor;
        }
        if (axisChart.options.scales.y?.ticks && axisChart.options.scales.y.ticks.display !== false) {
          axisChart.options.scales.y.ticks.color = textColor;
        }
      }
      axisChart.update('none');
    }
  }, [theme, textColor, tooltipBg, tooltipBorder, tooltipTitle, tooltipBody, isDark, isDonut, isPie]);

  // Direct pointer/touch click and move handler for mobile, tablet, and desktop
  const handleCanvasInteraction = (e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const chart = chartInstanceRef.current;
    if (!chart) return;
    const canvas = dataCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const ratioX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ratioY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const pos = {
      x: Math.round(ratioX * chart.width),
      y: Math.round(ratioY * chart.height),
    };

    const mode: 'nearest' | 'index' = isDonut || isPie ? 'nearest' : 'index';
    const axis: 'x' | 'y' | 'xy' = isDonut || isPie ? 'xy' : isHorizontal ? 'y' : 'x';

    try {
      // Pass event wrapper with nativeEvent so Chart.js getRelativePosition preserves {x, y}
      const eventWrapper = {
        native: (e as any).nativeEvent || e,
        x: pos.x,
        y: pos.y,
      };

      const elements = chart.getElementsAtEventForMode(
        eventWrapper as any,
        mode,
        { intersect: false, axis },
        false
      );

      if (elements && elements.length > 0) {
        chart.setActiveElements(elements);
        if (chart.tooltip) {
          chart.tooltip.setActiveElements(elements, pos);
        }
        chart.update();
      }
    } catch {
      // Ignore safe fallback
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // On touch/pen or when pointer button is down, track drag selection in real-time
    if (e.pointerType === 'touch' || e.pointerType === 'pen' || e.buttons > 0) {
      handleCanvasInteraction(e);
    }
  };

  // -------------------------------------------------------------------------
  // RENDER COMPONENT
  // -------------------------------------------------------------------------

  // 2. Horizontal Chart Architecture (>= 50 items):
  // Synchronized dual-canvas layout with virtualized rendering
  if (itemCount >= SCROLL_THRESHOLD && isHorizontal) {
    const initEndIndex = Math.min(itemCount, Math.ceil(VIEWPORT_HEIGHT / ITEM_HEIGHT) + BUFFER_COUNT * 2);
    const initialHeight = initEndIndex * ITEM_HEIGHT;
    const totalScrollHeight = itemCount * ITEM_HEIGHT;

    return (
      <div
        ref={containerRef}
        className="w-full h-[520px] relative overflow-hidden flex flex-col"
      >
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="overflow-y-auto w-full flex-1 custom-scrollbar relative flex flex-col"
        >
          {/* Header (Sticky Top): Canvas A */}
          <div className="sticky top-0 z-20 h-[48px] w-full bg-white dark:bg-slate-900 shrink-0 pointer-events-none">
            <canvas ref={axisCanvasRef} className="w-full h-full block" />
          </div>

          {/* Body (Scrollable): Canvas B */}
          <div style={{ height: `${totalScrollHeight}px`, width: '100%', position: 'relative' }}>
            <div
              ref={sliceWrapperRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${initialHeight}px`,
                transform: 'translateY(0px)',
                willChange: 'transform',
              }}
            >
              <canvas
                ref={dataCanvasRef}
                onPointerDown={handleCanvasInteraction}
                onPointerMove={handleCanvasPointerMove}
                onClick={handleCanvasInteraction}
                style={{ touchAction: 'pan-y' }}
                className="w-full h-full block cursor-pointer touch-manipulation"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Bar Chart Architecture (>= 50 items):
  // Synchronized dual-canvas layout with virtualized rendering
  if (itemCount >= SCROLL_THRESHOLD && !isHorizontal && !isDonut && !isPie) {
    const initEndIndex = Math.min(itemCount, 25 + BUFFER_COUNT * 2);
    const initialWidth = initEndIndex * ITEM_WIDTH;
    const totalScrollWidth = itemCount * ITEM_WIDTH;

    return (
      <div
        ref={containerRef}
        className="w-full h-[450px] relative overflow-hidden flex"
      >
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onWheel={(e) => {
            if (e.deltaY && !e.deltaX) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="overflow-x-auto w-full flex-1 custom-scrollbar h-full relative flex"
        >
          {/* Sidebar (Sticky Left): Canvas A */}
          <div
            className="sticky left-0 z-20 shrink-0 bg-white dark:bg-slate-900 pointer-events-none h-full"
            style={{ width: `${yAxisWidth}px` }}
          >
            <canvas ref={axisCanvasRef} className="w-full h-full block" />
          </div>

          {/* Body (Scrollable): Canvas B */}
          <div style={{ width: `${totalScrollWidth}px`, height: '100%', position: 'relative', flexShrink: 0 }}>
            <div
              ref={sliceWrapperRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${initialWidth}px`,
                transform: 'translateX(0px)',
                willChange: 'transform',
              }}
            >
              <canvas
                ref={dataCanvasRef}
                onPointerDown={handleCanvasInteraction}
                onPointerMove={handleCanvasPointerMove}
                onClick={handleCanvasInteraction}
                style={{ touchAction: 'pan-x' }}
                className="w-full h-full block cursor-pointer touch-manipulation"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Donut / Pie View
  if (isDonut || isPie) {
    return (
      <div ref={containerRef} className="w-full h-80 relative flex items-center justify-center overflow-hidden">
        <div className="w-full h-full relative">
          <canvas
            ref={dataCanvasRef}
            onPointerDown={handleCanvasInteraction}
            onPointerMove={handleCanvasPointerMove}
            onClick={handleCanvasInteraction}
            style={{ touchAction: 'manipulation' }}
            className="w-full h-full block cursor-pointer touch-manipulation"
          />
        </div>
      </div>
    );
  }

  // Mode A: Standard Responsive View (Under 50 Items)
  // Completely disable all scrollable containers (overflow: hidden).
  // Do NOT use the split-canvas sticky axis pattern.
  // Set the canvas container to standard responsive dimensions, scaling comfortably for horizontal bars
  const minHeightClass = isHorizontal && isSmallItemCount ? 'min-h-[180px]' : 'min-h-[440px]';

  return (
    <div
      ref={containerRef}
      style={{ height: `${modeAHeight}px` }}
      className={`w-full ${minHeightClass} relative overflow-hidden`}
    >
      <canvas
        ref={dataCanvasRef}
        onPointerDown={handleCanvasInteraction}
        onPointerMove={handleCanvasPointerMove}
        onClick={handleCanvasInteraction}
        style={{ touchAction: isHorizontal ? 'pan-y' : 'manipulation' }}
        className="w-full h-full block cursor-pointer touch-manipulation"
      />
    </div>
  );
});
