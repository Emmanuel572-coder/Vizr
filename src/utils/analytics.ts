import { SalesRecord, AggregatedDataPoint, DimensionType, MetricType } from '../types';
import { cleanNumber } from './schemaEngine';

export const PAYMENT_COLORS: Record<string, string> = {
  'Credit Card': '#3b82f6',
  'Debit Card': '#10b981',
  'eWallet': '#8b5cf6',
  'Cash': '#f59e0b',
  'Apple Pay': '#000000',
  'Wire Transfer': '#0284c7',
  'Stripe Card': '#6366f1',
  'PayPal': '#0284c7',
  'ACH Debit': '#059669',
  'Corporate Card': '#475569',
  'Direct': '#3b82f6',
};

export const PRODUCT_PALETTE = [
  '#2563eb', // blue-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#7c3aed', // violet-600
  '#e11d48', // rose-600
  '#0891b2', // cyan-600
  '#ea580c', // orange-600
  '#c026d3', // fuchsia-600
  '#4f46e5', // indigo-600
  '#16a34a', // green-600
  '#0284c7', // sky-600
  '#9333ea', // purple-600
];

/**
 * Vibrant, high-contrast categorical palette specifically engineered for Donut & Pie charts.
 * Each color is picked for maximum perceptual distance from its neighbors and clean visibility in both Light & Dark modes.
 */
export const DISTINCT_DONUT_COLORS = [
  '#2563eb', // 1. Electric Cobalt Blue
  '#059669', // 2. Emerald Green
  '#d97706', // 3. Amber Orange
  '#7c3aed', // 4. Vivid Violet
  '#e11d48', // 5. Rose Crimson
  '#0891b2', // 6. Cyan / Marine
  '#ea580c', // 7. Tangerine Coral
  '#c026d3', // 8. Fuchsia / Magenta
  '#4f46e5', // 9. Indigo
  '#16a34a', // 10. Leaf Green
  '#db2777', // 11. Pink
  '#0284c7', // 12. Sky Blue
  '#9333ea', // 13. Deep Purple
  '#ca8a04', // 14. Golden Mustard
  '#0d9488', // 15. Deep Teal
  '#f43f5e', // 16. Sunset Red
  '#6366f1', // 17. Periwinkle Blue
  '#84cc16', // 18. Lime
  '#a855f7', // 19. Lilac
  '#f97316', // 20. Bright Orange
];

/**
 * Returns a high-contrast, visually distinct color for any index.
 * For indices beyond the curated list, generates deterministically distributed
 * hues using the Golden Angle (137.508°) to guarantee adjacent slices are never similar.
 */
export function getDistinctDonutColor(index: number): string {
  if (index < DISTINCT_DONUT_COLORS.length) {
    return DISTINCT_DONUT_COLORS[index];
  }
  // Golden ratio hue distribution ensures adjacent slices are maximally separated in hue:
  const goldenAngle = 137.50776405003785;
  const hue = Math.round((index * goldenAngle) % 360);
  const saturation = 76 + (index % 3) * 5; // 76% - 86%
  const lightness = 48 + (index % 2) * 6; // 48% - 54%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatDate(dateString: string): string {
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return dateString;
  } catch {
    return dateString;
  }
}

export function calculateSummaryMetrics(records: SalesRecord[]) {
  if (records.length === 0) {
    return {
      totalRevenue: 0,
      totalVolume: 0,
      avgOrderValue: 0,
      uniqueOrders: 0,
      topProduct: 'None',
      topPaymentMethod: 'None',
      avgItemPrice: 0,
    };
  }

  const totalRevenue = records.reduce((sum, r) => sum + (r.price || 0), 0);
  const totalVolume = records.length;
  const uniqueOrderSet = new Set(records.map((r) => r.orderNumber || r.id));
  const uniqueOrders = uniqueOrderSet.size;
  const avgOrderValue = uniqueOrders > 0 ? totalRevenue / uniqueOrders : 0;
  const avgItemPrice = totalVolume > 0 ? totalRevenue / totalVolume : 0;

  // Find top product
  const productCountMap: Record<string, number> = {};
  records.forEach((r) => {
    const p = r.product || '(Unspecified)';
    productCountMap[p] = (productCountMap[p] || 0) + 1;
  });
  let topProduct = '';
  let maxProdCount = -1;
  Object.entries(productCountMap).forEach(([prod, count]) => {
    if (count > maxProdCount) {
      maxProdCount = count;
      topProduct = prod;
    }
  });

  // Find top payment method
  const payMap: Record<string, number> = {};
  records.forEach((r) => {
    const pay = r.paymentMethod || 'Direct';
    payMap[pay] = (payMap[pay] || 0) + 1;
  });
  let topPaymentMethod = '';
  let maxPayCount = -1;
  Object.entries(payMap).forEach(([pay, count]) => {
    if (count > maxPayCount) {
      maxPayCount = count;
      topPaymentMethod = pay;
    }
  });

  return {
    totalRevenue,
    totalVolume,
    avgOrderValue,
    uniqueOrders,
    topProduct,
    topPaymentMethod,
    avgItemPrice,
  };
}

/**
 * Dynamically aggregates records by ANY specified dimension and metric
 */
export function aggregateByDimension(
  records: SalesRecord[],
  dimension: DimensionType,
  metric: MetricType
): AggregatedDataPoint[] {
  const map: Record<
    string,
    { revenue: number; volume: number; prices: number[]; secondaryBreakdown: Record<string, number> }
  > = {};

  records.forEach((r) => {
    // Determine dimension key from row
    let key = '';
    if (dimension === 'date') {
      key = r.date || 'Undated';
    } else if (r[dimension] !== undefined && r[dimension] !== null && String(r[dimension]).trim() !== '') {
      key = String(r[dimension]).trim();
    } else if (dimension === 'product' && r.product) {
      key = r.product;
    } else if (dimension === 'paymentMethod' && r.paymentMethod) {
      key = r.paymentMethod;
    } else {
      key = r.product || '(Other)';
    }

    // Determine metric value from row
    let metricVal = 0;
    if (metric === 'volume' || metric === 'count' || metric === 'records') {
      metricVal = 1;
    } else if (metric === 'revenue' || metric === 'price') {
      metricVal = typeof r.price === 'number' ? r.price : cleanNumber(r.price) || 0;
    } else if (r[metric] !== undefined && r[metric] !== null) {
      metricVal = typeof r[metric] === 'number' ? r[metric] : cleanNumber(r[metric]) || 0;
    } else {
      metricVal = typeof r.price === 'number' ? r.price : 1;
    }

    if (!map[key]) {
      map[key] = { revenue: 0, volume: 0, prices: [], secondaryBreakdown: {} };
    }
    map[key].revenue += metricVal;
    map[key].volume += 1;
    map[key].prices.push(metricVal);

    // Track secondary breakdown for stacked charts
    const secTag = String(r.paymentMethod || r['Category'] || r['Department'] || r['Billing Frequency'] || r['Tender Method'] || r['Checkout Channel'] || 'Direct');
    map[key].secondaryBreakdown[secTag] = (map[key].secondaryBreakdown[secTag] || 0) + metricVal;
  });

  const totalMetric = records.reduce((sum, r) => {
    if (metric === 'volume' || metric === 'count') return sum + 1;
    if (metric === 'revenue' || metric === 'price') return sum + (r.price || 0);
    const v = r[metric] !== undefined ? cleanNumber(r[metric]) || 0 : (r.price || 1);
    return sum + v;
  }, 0);

  const points: AggregatedDataPoint[] = Object.entries(map).map(([name, data]) => {
    const avgPrice = data.prices.length > 0 ? data.revenue / data.prices.length : 0;
    const primaryValue =
      metric === 'volume' || metric === 'count'
        ? data.volume
        : metric === 'avgPrice'
        ? avgPrice
        : data.revenue;

    const percentage = totalMetric > 0 ? (primaryValue / totalMetric) * 100 : 0;

    return {
      name,
      displayName: dimension.toLowerCase().includes('date') ? formatDate(name) : name,
      revenue: parseFloat((data.revenue ?? 0).toFixed(2)),
      volume: data.volume ?? 0,
      avgPrice: parseFloat((avgPrice ?? 0).toFixed(2)),
      percentage: parseFloat((percentage ?? 0).toFixed(1)),
      value: parseFloat((primaryValue ?? 0).toFixed(2)),
      ...data.secondaryBreakdown,
    };
  });

  // Sorting
  if (dimension.toLowerCase().includes('date')) {
    return points.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Sort descending by primary metric value
    return points.sort((a, b) => b.value - a.value);
  }
}

export function getPaymentMethodsList(records: SalesRecord[]): string[] {
  const values = new Set<string>();
  records.forEach((r) => {
    if (r.paymentMethod) values.add(r.paymentMethod);
    if (r['Tender Method']) values.add(String(r['Tender Method']));
    if (r['Checkout Channel']) values.add(String(r['Checkout Channel']));
    if (r['Payment Gateway']) values.add(String(r['Payment Gateway']));
    if (r['Vendor Supplier']) values.add(String(r['Vendor Supplier']));
  });
  return Array.from(values).filter(Boolean).sort();
}

export function getProductsList(records: SalesRecord[]): string[] {
  const values = new Set<string>();
  records.forEach((r) => {
    if (r.product) values.add(r.product);
    if (r['Item Ordered']) values.add(String(r['Item Ordered']));
    if (r['Garment Description']) values.add(String(r['Garment Description']));
    if (r['Subscription Tier']) values.add(String(r['Subscription Tier']));
    if (r['Hardware Item']) values.add(String(r['Hardware Item']));
    if (r['Membership Package']) values.add(String(r['Membership Package']));
  });
  return Array.from(values).filter(Boolean).sort();
}
