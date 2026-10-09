import * as XLSX from 'xlsx';
import { SalesRecord } from '../types';

/**
 * Parses CSV text, handling quotes, commas, semicolons, tabs, and pipes.
 */
export function parseCSVToRecords(text: string): SalesRecord[] {
  if (!text || !text.trim()) return [];

  // Normalize newlines
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Detect delimiter
  const firstLine = lines[0];
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const pipeCount = (firstLine.match(/\|/g) || []).length;

  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount) delimiter = '\t';
  else if (pipeCount > commaCount) delimiter = '|';

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  // Find column matches
  let orderIdx = headers.findIndex(h => h.includes('order') || h.includes('id') || h.includes('number') || h.includes('code') || h.includes('ref'));
  let prodIdx = headers.findIndex(h => h.includes('product') || h.includes('item') || h.includes('desc') || h.includes('title') || h.includes('name') || h.includes('category'));
  let priceIdx = headers.findIndex(h => h.includes('price') || h.includes('amount') || h.includes('cost') || h.includes('revenue') || h.includes('total') || h.includes('value'));
  let dateIdx = headers.findIndex(h => h.includes('date') || h.includes('time') || h.includes('day') || h.includes('period'));
  let payIdx = headers.findIndex(h => h.includes('pay') || h.includes('method') || h.includes('type') || h.includes('status') || h.includes('channel'));

  if (orderIdx === -1) orderIdx = 0;
  if (prodIdx === -1) prodIdx = headers.length > 1 ? 1 : 0;
  if (priceIdx === -1) priceIdx = headers.length > 2 ? 2 : (headers.length > 1 ? 1 : 0);
  if (dateIdx === -1) dateIdx = headers.length > 3 ? 3 : -1;
  if (payIdx === -1) payIdx = headers.length > 4 ? 4 : -1;

  const records: SalesRecord[] = [];
  const today = new Date().toISOString().split('T')[0];

  for (let i = 1; i < lines.length; i++) {
    const parts = parseLine(lines[i]);
    if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

    const orderNumber = (parts[orderIdx] || `ORD-${1000 + i}`).replace(/^"+|"+$/g, '');
    const product = (parts[prodIdx] || `Item ${i}`).replace(/^"+|"+$/g, '');
    const rawPrice = parts[priceIdx] || '0';
    const priceNum = parseFloat(rawPrice.replace(/[^0-9.-]+/g, '')) || 0;
    
    let date = dateIdx !== -1 && parts[dateIdx] ? parts[dateIdx].replace(/^"+|"+$/g, '') : today;
    // Format YYYY-MM-DD if recognizable
    if (date.includes('/')) {
      const segs = date.split('/');
      if (segs.length === 3) {
        if (segs[2].length === 4) date = `${segs[2]}-${segs[0].padStart(2, '0')}-${segs[1].padStart(2, '0')}`;
      }
    }

    const paymentMethod = payIdx !== -1 && parts[payIdx] 
      ? parts[payIdx].replace(/^"+|"+$/g, '') 
      : 'Direct';

    records.push({
      id: `record-csv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      orderNumber,
      product,
      price: Math.abs(priceNum),
      date: date || today,
      paymentMethod,
    });
  }

  return records;
}

/**
 * Parses CSV text asynchronously in chunks of 5,000 rows with main thread yielding.
 */
export async function parseCSVToRecordsAsync(text: string): Promise<SalesRecord[]> {
  if (!text || !text.trim()) return [];

  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const pipeCount = (firstLine.match(/\|/g) || []).length;

  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount) delimiter = '\t';
  else if (pipeCount > commaCount) delimiter = '|';

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  let orderIdx = headers.findIndex(h => h.includes('order') || h.includes('id') || h.includes('number') || h.includes('code') || h.includes('ref'));
  let prodIdx = headers.findIndex(h => h.includes('product') || h.includes('item') || h.includes('desc') || h.includes('title') || h.includes('name') || h.includes('category'));
  let priceIdx = headers.findIndex(h => h.includes('price') || h.includes('amount') || h.includes('cost') || h.includes('revenue') || h.includes('total') || h.includes('value'));
  let dateIdx = headers.findIndex(h => h.includes('date') || h.includes('time') || h.includes('day') || h.includes('period'));
  let payIdx = headers.findIndex(h => h.includes('pay') || h.includes('method') || h.includes('type') || h.includes('status') || h.includes('channel'));

  if (orderIdx === -1) orderIdx = 0;
  if (prodIdx === -1) prodIdx = headers.length > 1 ? 1 : 0;
  if (priceIdx === -1) priceIdx = headers.length > 2 ? 2 : (headers.length > 1 ? 1 : 0);
  if (dateIdx === -1) dateIdx = headers.length > 3 ? 3 : -1;
  if (payIdx === -1) payIdx = headers.length > 4 ? 4 : -1;

  const records: SalesRecord[] = [];
  const today = new Date().toISOString().split('T')[0];
  const CHUNK_SIZE = 5000;

  for (let i = 1; i < lines.length; i++) {
    const parts = parseLine(lines[i]);
    if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

    const orderNumber = (parts[orderIdx] || `ORD-${1000 + i}`).replace(/^"+|"+$/g, '');
    const product = (parts[prodIdx] || `Item ${i}`).replace(/^"+|"+$/g, '');
    const rawPrice = parts[priceIdx] || '0';
    const priceNum = parseFloat(rawPrice.replace(/[^0-9.-]+/g, '')) || 0;
    
    let date = dateIdx !== -1 && parts[dateIdx] ? parts[dateIdx].replace(/^"+|"+$/g, '') : today;
    if (date.includes('/')) {
      const segs = date.split('/');
      if (segs.length === 3 && segs[2].length === 4) {
        date = `${segs[2]}-${segs[0].padStart(2, '0')}-${segs[1].padStart(2, '0')}`;
      }
    }

    const paymentMethod = payIdx !== -1 && parts[payIdx] 
      ? parts[payIdx].replace(/^"+|"+$/g, '') 
      : 'Direct';

    records.push({
      id: `record-csv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      orderNumber,
      product,
      price: Math.abs(priceNum),
      date: date || today,
      paymentMethod,
    });

    if (i % CHUNK_SIZE === 0 && i < lines.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return records;
}

/**
 * Parses XLSX / XLS ArrayBuffer into SalesRecord array using SheetJS
 */
export function parseXLSXToRecords(buffer: ArrayBuffer): SalesRecord[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel workbook contains no sheets.');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('First worksheet in Excel file has no data.');
  }

  const firstRow = rawRows[0];
  const keys = Object.keys(firstRow);

  const findKey = (patterns: string[]): string | undefined => {
    return keys.find(k => {
      const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      return patterns.some(p => norm.includes(p));
    });
  };

  const orderKey = findKey(['order', 'id', 'num', 'code', 'ref', 'invoice']) || keys[0];
  const prodKey = findKey(['product', 'item', 'desc', 'title', 'name', 'category', 'label']) || keys[1] || keys[0];
  const priceKey = findKey(['price', 'amount', 'cost', 'revenue', 'total', 'value', 'sales']) || keys[2] || keys[1] || keys[0];
  const dateKey = findKey(['date', 'time', 'day', 'created', 'period']);
  const payKey = findKey(['pay', 'method', 'type', 'channel', 'mode', 'status']);

  const today = new Date().toISOString().split('T')[0];

  return rawRows.map((row, index) => {
    const orderNumber = String(row[orderKey] || `EXCEL-${1000 + index}`);
    const product = String(row[prodKey] || `Product ${index + 1}`);
    const rawPrice = String(row[priceKey] || '0');
    const priceNum = parseFloat(rawPrice.replace(/[^0-9.-]+/g, '')) || 0;
    
    let dateStr = dateKey && row[dateKey] ? String(row[dateKey]) : today;
    // If Excel date serial number
    if (/^\d{5}$/.test(dateStr)) {
      const serial = parseInt(dateStr, 10);
      const parsedDate = new Date((serial - 25569) * 86400 * 1000);
      dateStr = parsedDate.toISOString().split('T')[0];
    }

    const paymentMethod = payKey && row[payKey] ? String(row[payKey]) : 'Excel Entry';

    return {
      id: `record-xlsx-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      orderNumber,
      product,
      price: Math.abs(priceNum),
      date: dateStr || today,
      paymentMethod,
    };
  });
}

/**
 * Parses JSON text (array of objects or wrapper with data/records key)
 */
export function parseJSONToRecords(text: string): SalesRecord[] {
  const data = JSON.parse(text);
  let rows: any[] = [];

  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.records)) rows = data.records;
    else if (Array.isArray(data.data)) rows = data.data;
    else if (Array.isArray(data.items)) rows = data.items;
    else if (Array.isArray(data.results)) rows = data.results;
    else if (Array.isArray(data.orders)) rows = data.orders;
    else {
      // Find first array property
      for (const val of Object.values(data)) {
        if (Array.isArray(val) && val.length > 0) {
          rows = val;
          break;
        }
      }
    }
  }

  if (!rows || rows.length === 0) {
    throw new Error('Could not find an array of data objects in the JSON file.');
  }

  const sample = rows[0];
  if (typeof sample !== 'object' || sample === null) {
    throw new Error('JSON array elements must be objects with column properties.');
  }

  const keys = Object.keys(sample);
  const findKey = (patterns: string[]): string | undefined => {
    return keys.find(k => {
      const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      return patterns.some(p => norm.includes(p));
    });
  };

  const orderKey = findKey(['order', 'id', 'num', 'code', 'ref']) || 'id';
  const prodKey = findKey(['product', 'item', 'desc', 'title', 'name', 'category', 'label']) || keys[0];
  const priceKey = findKey(['price', 'amount', 'cost', 'revenue', 'total', 'value', 'fee']) || keys[1] || keys[0];
  const dateKey = findKey(['date', 'time', 'day', 'created', 'period']);
  const payKey = findKey(['pay', 'method', 'type', 'channel', 'mode']);

  const today = new Date().toISOString().split('T')[0];

  return rows.map((row, index) => {
    const orderNumber = String(row[orderKey] || `JSON-${1000 + index}`);
    const product = String(row[prodKey] || `Item ${index + 1}`);
    const rawVal = row[priceKey];
    let priceNum = 0;
    if (typeof rawVal === 'number') {
      priceNum = rawVal;
    } else {
      priceNum = parseFloat(String(rawVal || 0).replace(/[^0-9.-]+/g, '')) || 0;
    }

    const date = dateKey && row[dateKey] ? String(row[dateKey]).slice(0, 10) : today;
    const paymentMethod = payKey && row[payKey] ? String(row[payKey]) : 'Standard';

    return {
      id: `record-json-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      orderNumber,
      product,
      price: Math.abs(priceNum),
      date: date || today,
      paymentMethod,
    };
  });
}

/**
 * Parses and fetches a Google Sheets URL
 */
export async function fetchGoogleSheetRecords(sheetUrl: string): Promise<SalesRecord[]> {
  if (!sheetUrl || !sheetUrl.trim()) {
    throw new Error('Please enter a valid Google Sheets URL.');
  }

  const trimmed = sheetUrl.trim();

  // Extract Spreadsheet ID
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch || !idMatch[1]) {
    throw new Error('Invalid Google Sheets URL format. URL must contain "/spreadsheets/d/{SPREADSHEET_ID}".');
  }

  const spreadsheetId = idMatch[1];

  // Extract GID (sheet tab id)
  let gid = '0';
  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
  if (gidMatch && gidMatch[1]) {
    gid = gidMatch[1];
  }

  // Google Visualization API CSV export endpoint (supports CORS for public sheets)
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

  let response: Response | null = null;
  let csvText = '';

  try {
    response = await fetch(gvizUrl);
    if (response.ok) {
      csvText = await response.text();
    }
  } catch {
    // Attempt fallback export URL
    try {
      response = await fetch(exportUrl);
      if (response && response.ok) {
        csvText = await response.text();
      }
    } catch {
      // Ignored, handled below
    }
  }

  if (!csvText || csvText.includes('<!DOCTYPE html>') || csvText.includes('<html')) {
    throw new Error(
      'Could not access Google Sheet. Please ensure the sheet sharing permission is set to "Anyone with the link can view". (File → Share → Share with others → General access: Anyone with the link).'
    );
  }

  const records = parseCSVToRecords(csvText);
  if (records.length === 0) {
    throw new Error('The Google Sheet did not contain any valid data rows.');
  }

  return records;
}

/**
 * High-performance Sample Datasets for instant 1-click exploration
 */
export const SAMPLE_DATASETS = {
  apparel: {
    id: 'apparel',
    title: 'Apparel & Fashion Retail',
    description: '116 orders across Denim, Trousers, Chinos, Shorts & Joggers with 4 payment methods',
    recordsCount: 116,
    format: 'CSV',
  },
  saas: {
    id: 'saas',
    title: 'Global SaaS Subscriptions',
    description: 'Cloud software recurring subscriptions across Starter, Growth & Enterprise tiers',
    recordsCount: 78,
    format: 'JSON',
  },
  hardware: {
    id: 'hardware',
    title: 'Electronics & Hardware Logistics',
    description: 'Procurement shipments of microcontrollers, displays, sensors, and power supplies',
    recordsCount: 65,
    format: 'XLSX',
  },
  googleSheet: {
    id: 'googleSheet',
    title: 'Quarterly Regional Sales (Demo Sheet)',
    description: 'Live synced spreadsheet simulation with regional distribution & revenue targets',
    recordsCount: 92,
    format: 'Google Sheets',
    sampleUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0',
  },
};

/**
 * Returns pre-built sample records for SaaS subscriptions
 */
export function getSaasSampleRecords(): SalesRecord[] {
  const plans = [
    { name: 'Enterprise Pro', price: 499 },
    { name: 'Business Scale', price: 199 },
    { name: 'Startup Team', price: 79 },
    { name: 'Developer Solo', price: 29 },
    { name: 'Dedicated Cloud Addon', price: 350 },
    { name: 'Custom SSO & Audit', price: 250 },
  ];

  const gateways = ['Stripe Card', 'Stripe Card', 'Wire Transfer', 'PayPal', 'ACH Direct Debit'];
  const records: SalesRecord[] = [];
  const baseDate = new Date(2025, 6, 1);

  for (let i = 1; i <= 78; i++) {
    const plan = plans[Math.floor(Math.random() * plans.length)];
    const pay = gateways[Math.floor(Math.random() * gateways.length)];
    const dateObj = new Date(baseDate.getTime() + Math.floor(Math.random() * 60) * 86400000);
    const dateStr = dateObj.toISOString().split('T')[0];

    records.push({
      id: `saas-${i}`,
      orderNumber: `SUB-${2000 + i}`,
      product: plan.name,
      price: plan.price,
      date: dateStr,
      paymentMethod: pay,
    });
  }

  return records;
}

/**
 * Returns pre-built sample records for Hardware Logistics
 */
export function getHardwareSampleRecords(): SalesRecord[] {
  const hardware = [
    { name: 'OLED Display 1.3"', price: 14.5 },
    { name: 'ARM Cortex M4 Board', price: 38.0 },
    { name: 'LiPo Battery 3.7V 2500mAh', price: 18.0 },
    { name: 'Precision Environmental Sensor', price: 24.0 },
    { name: 'Wi-Fi 6 IoT Module', price: 12.0 },
    { name: 'CNC Anodized Aluminum Enclosure', price: 65.0 },
    { name: 'USB-C High-Speed Debugger', price: 42.0 },
  ];

  const suppliers = ['Credit Card', 'Purchase Order', 'Direct Wire', 'eWallet'];
  const records: SalesRecord[] = [];
  const baseDate = new Date(2025, 7, 1);

  for (let i = 1; i <= 65; i++) {
    const item = hardware[Math.floor(Math.random() * hardware.length)];
    const pay = suppliers[Math.floor(Math.random() * suppliers.length)];
    const qty = Math.floor(Math.random() * 5) + 1;
    const dateObj = new Date(baseDate.getTime() + Math.floor(Math.random() * 45) * 86400000);
    const dateStr = dateObj.toISOString().split('T')[0];

    records.push({
      id: `hw-${i}`,
      orderNumber: `PO-${8000 + i}`,
      product: item.name,
      price: Math.round(item.price * qty * 100) / 100,
      date: dateStr,
      paymentMethod: pay,
    });
  }

  return records;
}
