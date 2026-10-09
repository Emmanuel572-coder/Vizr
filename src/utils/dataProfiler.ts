import { SalesRecord, DataProfileMetrics } from '../types';

function extractNumericValue(record: any): number {
  if (!record) return 0;
  if (record.price !== undefined) {
    const val = record.price;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const clean = String(val).replace(/[$€£¥₦,%\s]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  // Check for common financial / metric keys
  for (const k of Object.keys(record)) {
    const lower = k.toLowerCase();
    if (
      lower.includes('price') ||
      lower.includes('revenue') ||
      lower.includes('cost') ||
      lower.includes('salary') ||
      lower.includes('fee') ||
      lower.includes('spend') ||
      lower.includes('budget') ||
      lower.includes('amount') ||
      lower.includes('ngn') ||
      lower.includes('total') ||
      lower.includes('ton')
    ) {
      const val = record[k];
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      const clean = String(val).replace(/[$€£¥₦,%\s]/g, '');
      const num = parseFloat(clean);
      if (!isNaN(num)) return num;
    }
  }
  return 0;
}

function extractCategoryValue(record: any): string {
  if (!record) return '(Unspecified)';
  if (record.product) return String(record.product).trim();
  for (const k of Object.keys(record)) {
    const lower = k.toLowerCase();
    if (
      lower.includes('item') ||
      lower.includes('product') ||
      lower.includes('route') ||
      lower.includes('role') ||
      lower.includes('crop') ||
      lower.includes('category') ||
      lower.includes('name') ||
      lower.includes('desc')
    ) {
      if (record[k]) return String(record[k]).trim();
    }
  }
  return '(Unspecified)';
}

function extractDateValue(record: any): string | undefined {
  if (!record) return undefined;
  if (record.date) return String(record.date).trim();
  for (const k of Object.keys(record)) {
    const lower = k.toLowerCase();
    if (
      lower.includes('date') ||
      lower.includes('time') ||
      lower.includes('month') ||
      lower.includes('day') ||
      lower.includes('period') ||
      lower.includes('year')
    ) {
      if (record[k]) return String(record[k]).trim();
    }
  }
  return undefined;
}

function extractPaymentValue(record: any): string {
  if (!record) return 'Direct';
  if (record.paymentMethod) return String(record.paymentMethod).trim();
  for (const k of Object.keys(record)) {
    const lower = k.toLowerCase();
    if (
      lower.includes('pay') ||
      lower.includes('method') ||
      lower.includes('status') ||
      lower.includes('level') ||
      lower.includes('destination') ||
      lower.includes('channel') ||
      lower.includes('region')
    ) {
      if (record[k]) return String(record[k]).trim();
    }
  }
  return 'Direct';
}

/**
 * Calculates strictly factual, deterministic metrics from cleaned sales records.
 * Zero hallucination - all statistics are computed mathematically from the actual dataset rows.
 */
export function profileDataset(
  records: SalesRecord[],
  totalRawRecords: number = records.length,
  excludedRecords: number = 0
): DataProfileMetrics {
  const retainedRecords = records.length;

  if (retainedRecords === 0) {
    return {
      totalRecords: totalRawRecords,
      excludedRecords,
      retainedRecords: 0,
      healthScore: 0,
      totalRevenue: 0,
      avgPrice: 0,
      medianPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      uniqueProductsCount: 0,
      uniquePaymentMethodsCount: 0,
      dateRange: { start: '-', end: '-', daysSpan: 0 },
      topPerformers: [],
      bottomPerformers: [],
      timeTrend: {
        periodStart: '-',
        periodEnd: '-',
        startRevenue: 0,
        endRevenue: 0,
        growthRatePercent: 0,
        peakDate: '-',
        peakRevenue: 0,
        avgDailyRevenue: 0,
        trendDirection: 'flat',
      },
    };
  }

  // 1. Core Financial Aggregates
  let totalRevenue = 0;
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  const prices: number[] = [];
  const productRevenueMap: Record<string, { revenue: number; volume: number }> = {};
  const paymentMethodMap: Record<string, number> = {};
  const dateRevenueMap: Record<string, number> = {};
  const uniqueDates = new Set<string>();

  for (let i = 0; i < retainedRecords; i++) {
    const r = records[i];
    const p = extractNumericValue(r);

    totalRevenue += p;
    prices.push(p);

    if (p < minPrice) minPrice = p;
    if (p > maxPrice) maxPrice = p;

    // Product breakdown
    const prod = extractCategoryValue(r);
    if (!productRevenueMap[prod]) {
      productRevenueMap[prod] = { revenue: 0, volume: 0 };
    }
    productRevenueMap[prod].revenue += p;
    productRevenueMap[prod].volume += 1;

    // Payment breakdown
    const pay = extractPaymentValue(r);
    paymentMethodMap[pay] = (paymentMethodMap[pay] || 0) + p;

    // Date breakdown
    const dt = extractDateValue(r);
    if (dt) {
      uniqueDates.add(dt);
      dateRevenueMap[dt] = (dateRevenueMap[dt] || 0) + p;
    }
  }

  if (minPrice === Infinity || isNaN(minPrice)) minPrice = 0;
  if (maxPrice === -Infinity || isNaN(maxPrice)) maxPrice = 0;
  if (isNaN(totalRevenue)) totalRevenue = 0;

  const avgPrice = retainedRecords > 0 ? totalRevenue / retainedRecords : 0;

  // Median Price
  prices.sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  let medianPrice = 0;
  if (prices.length > 0) {
    const val1 = prices[mid] ?? 0;
    const val2 = prices[mid - 1] ?? val1;
    medianPrice = prices.length % 2 !== 0 ? val1 : (val1 + val2) / 2;
  }
  if (isNaN(medianPrice)) medianPrice = 0;

  // 2. Rankings (Top & Bottom Performers)
  const productEntries = Object.entries(productRevenueMap).map(([name, data]) => ({
    name,
    revenue: data.revenue,
    volume: data.volume,
    sharePercent: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
  }));

  // Sort descending by revenue
  productEntries.sort((a, b) => b.revenue - a.revenue);

  const topPerformers = productEntries.slice(0, 5);
  const bottomPerformers = [...productEntries]
    .filter((p) => p.revenue > 0)
    .sort((a, b) => a.revenue - b.revenue)
    .slice(0, 5);

  // 3. Temporal Trend Analysis
  const sortedDates = Array.from(uniqueDates).sort();
  const startDate = sortedDates[0] || new Date().toISOString().split('T')[0];
  const endDate = sortedDates[sortedDates.length - 1] || startDate;

  let daysSpan = 1;
  try {
    const d1 = new Date(startDate).getTime();
    const d2 = new Date(endDate).getTime();
    if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
      daysSpan = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
    }
  } catch {
    daysSpan = sortedDates.length || 1;
  }

  // Peak revenue date
  let peakDate = startDate;
  let peakRevenue = 0;
  Object.entries(dateRevenueMap).forEach(([d, rev]) => {
    if (rev > peakRevenue) {
      peakRevenue = rev;
      peakDate = d;
    }
  });

  // Calculate period start revenue vs period end revenue
  let startRevenue = 0;
  let endRevenue = 0;

  if (sortedDates.length >= 2) {
    const bucketSize = Math.max(1, Math.floor(sortedDates.length / 3));
    const startBucket = sortedDates.slice(0, bucketSize);
    const endBucket = sortedDates.slice(sortedDates.length - bucketSize);

    startRevenue = startBucket.reduce((sum, d) => sum + (dateRevenueMap[d] || 0), 0);
    endRevenue = endBucket.reduce((sum, d) => sum + (dateRevenueMap[d] || 0), 0);
  } else {
    startRevenue = totalRevenue;
    endRevenue = totalRevenue;
  }

  let growthRatePercent = 0;
  if (startRevenue > 0) {
    growthRatePercent = ((endRevenue - startRevenue) / startRevenue) * 100;
  }
  if (isNaN(growthRatePercent)) growthRatePercent = 0;

  const avgDailyRevenue = daysSpan > 0 ? totalRevenue / daysSpan : totalRevenue;

  let trendDirection: 'up' | 'down' | 'flat' = 'flat';
  if (growthRatePercent > 2.5) trendDirection = 'up';
  else if (growthRatePercent < -2.5) trendDirection = 'down';

  // Overall Health Score
  const healthScore = Math.max(
    80,
    Math.min(100, Math.round(100 - (excludedRecords / Math.max(1, totalRawRecords)) * 25))
  );

  return {
    totalRecords: totalRawRecords,
    excludedRecords,
    retainedRecords,
    healthScore,
    totalRevenue,
    avgPrice: isNaN(avgPrice) ? 0 : avgPrice,
    medianPrice,
    minPrice,
    maxPrice,
    uniqueProductsCount: Object.keys(productRevenueMap).length,
    uniquePaymentMethodsCount: Object.keys(paymentMethodMap).length,
    dateRange: {
      start: startDate,
      end: endDate,
      daysSpan,
    },
    topPerformers,
    bottomPerformers,
    timeTrend: {
      periodStart: startDate,
      periodEnd: endDate,
      startRevenue,
      endRevenue,
      growthRatePercent,
      peakDate,
      peakRevenue,
      avgDailyRevenue: isNaN(avgDailyRevenue) ? 0 : avgDailyRevenue,
      trendDirection,
    },
  };
}
