import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface NormalizedDataResult {
  records: Record<string, any>[];
  headers: string[];
  matrix: string[][];
  fileName: string;
}

/**
 * Recursive flattening function that takes nested JSON objects
 * (e.g., {"sales": {"Q1": 500}}) and flattens them into single-level
 * key-value pairs (e.g., {"sales_Q1": 500}).
 */
export function flattenJsonObject(
  obj: Record<string, any>,
  prefix = ''
): Record<string, any> {
  const flattened: Record<string, any> = {};

  if (!obj || typeof obj !== 'object') {
    return flattened;
  }

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}_${key}` : key;

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      // Recursively flatten nested object
      const nested = flattenJsonObject(value, newKey);
      Object.assign(flattened, nested);
    } else if (Array.isArray(value)) {
      // If array contains primitives, join or format
      if (value.length > 0 && typeof value[0] !== 'object') {
        flattened[newKey] = value.join(', ');
      } else {
        // Nested array of objects: flatten each by index
        value.forEach((item, idx) => {
          if (item !== null && typeof item === 'object') {
            const nested = flattenJsonObject(item, `${newKey}_${idx + 1}`);
            Object.assign(flattened, nested);
          } else {
            flattened[`${newKey}_${idx + 1}`] = item;
          }
        });
      }
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}

/**
 * Converts an array of objects to standard headers and 2D matrix
 */
export function objectsToMatrix(records: Record<string, any>[]): {
  headers: string[];
  matrix: string[][];
} {
  if (!records || records.length === 0) {
    return { headers: [], matrix: [] };
  }

  // Preserve the exact arrangement of headers from the first record's keys
  const firstRecordKeys = Object.keys(records[0]).filter((k) => k !== 'id' && !k.startsWith('_'));
  const headerSet = new Set<string>(firstRecordKeys);
  records.forEach((rec) => {
    Object.keys(rec).forEach((k) => {
      if (k !== 'id' && !k.startsWith('_')) {
        headerSet.add(k);
      }
    });
  });

  const headers = Array.from(headerSet);

  const matrixRows = records.map((rec) => {
    return headers.map((h) => {
      const val = rec[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'number') return String(val);
      if (val instanceof Date) return val.toISOString().split('T')[0];
      return String(val);
    });
  });

  const matrix = [headers, ...matrixRows];
  return { headers, matrix };
}

/**
 * Helper to check if a cell value represents numeric or data types (number, currency, date, etc.)
 */
function isCellNumericOrData(val: any): boolean {
  if (val === null || val === undefined || val === '') return false;
  if (typeof val === 'number') return true;
  const s = String(val).trim();
  // Strip currency / commas / percentage to check if numeric
  const clean = s.replace(/[₦$£€¥,\s%]/g, '').replace(/\b(ngn|usd|gbp|eur)\b/gi, '');
  if (!isNaN(Number(clean)) && clean !== '') return true;
  // Check if date format
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(s)) return true;
  return false;
}

/**
 * Fallback Validation:
 * If the parser detects the "headers" are numeric or match the row data types,
 * flag it as "headerless", generate generic headers ("Col A", "Col B"),
 * and push the first row back into the dataset array.
 */
export function detectIsHeaderless(firstRow: any[], secondRow?: any[]): boolean {
  if (!firstRow || firstRow.length === 0) return true;

  // Count how many cells in firstRow are pure numbers or dates
  let numericOrDataCount = 0;
  for (const cell of firstRow) {
    if (isCellNumericOrData(cell)) {
      numericOrDataCount++;
    }
  }

  // 1. If at least 50% of the cells in the first row are numeric or dates, it's data
  if (numericOrDataCount / firstRow.length >= 0.5) {
    return true;
  }

  // 2. If all non-empty cells in firstRow are numbers
  const nonEmpty = firstRow.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
  if (nonEmpty.length > 0 && nonEmpty.every((c) => isCellNumericOrData(c))) {
    return true;
  }

  // 3. If secondRow exists, compare data types across columns
  if (secondRow && secondRow.length > 0) {
    let matchingTypeCount = 0;
    const len = Math.min(firstRow.length, secondRow.length);
    for (let i = 0; i < len; i++) {
      const type1 = isCellNumericOrData(firstRow[i]);
      const type2 = isCellNumericOrData(secondRow[i]);
      if (type1 && type2) {
        matchingTypeCount++;
      }
    }
    // If multiple columns have numeric data in row 0 where row 1 also has numeric data:
    if (matchingTypeCount >= 2 || (len <= 2 && matchingTypeCount >= 1)) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes 2D row arrays with strict header enforcement and fallback validation:
 * 1. Explicitly extracts first row as headers.
 * 2. If first row is detected as numeric/data, flags as headerless, generates "Col A", "Col B",
 *    and pushes first row back into the dataset array.
 * 3. Produces an Array of Objects with explicit string-based keys.
 *
 * Asynchronous Parsing & UI Yielding:
 * Process large CSV parsing in chunks (e.g., 5,000 rows at a time).
 * Use await new Promise(resolve => setTimeout(resolve, 0)) between chunks
 * to yield the main thread and keep the loading spinner animating.
 */
export async function normalizeRowsWithHeaderValidation(
  rawRows: any[][],
  fileName: string
): Promise<NormalizedDataResult> {
  // Filter out completely blank rows
  const nonBlankRows = rawRows.filter(
    (row) =>
      Array.isArray(row) &&
      row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
  );

  if (nonBlankRows.length === 0) {
    throw new Error('The file contains no data rows.');
  }

  const firstRow = nonBlankRows[0];
  const secondRow = nonBlankRows[1];

  const isHeaderless = detectIsHeaderless(firstRow, secondRow);

  let headers: string[] = [];
  let dataRows: any[][] = [];

  if (isHeaderless) {
    // Generate generic headers ("Col A", "Col B", "Col C"...)
    const numCols = Math.max(...nonBlankRows.map((r) => (Array.isArray(r) ? r.length : 0)));
    headers = Array.from({ length: numCols }, (_, idx) => {
      const colLetter = String.fromCharCode(65 + (idx % 26));
      const suffix = idx >= 26 ? Math.floor(idx / 26) : '';
      return `Col ${colLetter}${suffix}`;
    });
    // Push the first row back into the dataset array
    dataRows = nonBlankRows;
  } else {
    // Explicitly extract the first row as headers
    headers = firstRow.map((cell, idx) => {
      const str = cell !== null && cell !== undefined ? String(cell).trim() : '';
      if (str) return str;
      const colLetter = String.fromCharCode(65 + (idx % 26));
      const suffix = idx >= 26 ? Math.floor(idx / 26) : '';
      return `Col ${colLetter}${suffix}`;
    });
    dataRows = nonBlankRows.slice(1);
  }

  // Process rows in chunks of 250 to yield the UI thread for smooth animations
  const CHUNK_SIZE = 250;
  const records: Record<string, any>[] = [];
  const matrix: string[][] = [headers];

  for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
    const chunk = dataRows.slice(i, i + CHUNK_SIZE);
    for (const row of chunk) {
      const obj: Record<string, any> = {};
      const mRow: string[] = [];
      headers.forEach((h, colIdx) => {
        const val = row[colIdx] !== undefined && row[colIdx] !== null ? row[colIdx] : '';
        obj[h] = val;
        mRow.push(String(val));
      });
      records.push(obj);
      matrix.push(mRow);
    }

    // Yield main thread between chunks so spinner animates smoothly
    if (i + CHUNK_SIZE < dataRows.length) {
      await new Promise((resolve) => setTimeout(resolve, 12));
    }
  }

  return {
    records,
    headers,
    matrix,
    fileName,
  };
}

/**
 * File Auto-Detection & Data Normalization Engine
 * Reads file extension and processes it accordingly:
 * - .csv: Passes through PapaParse into normalized Array of Objects
 * - .xlsx / .xls: SheetJS XLSX.read -> first worksheet -> header enforcement
 * - .json: Natively parses & recursively flattens nested objects into single-level keys
 */
export async function normalizeUploadedFile(file: File): Promise<NormalizedDataResult> {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  if (extension === 'csv') {
    return parseCsvFile(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseXlsxFile(file);
  } else if (extension === 'json') {
    return parseJsonFile(file);
  } else {
    throw new Error(
      `Unsupported file type: .${extension}. Please upload a .csv, .xlsx, or .json file.`
    );
  }
}

/**
 * 1. CSV Parser using PapaParse
 * Explicitly extracts the first row as headers, with fallback validation for headerless datasets.
 */
function parseCsvFile(file: File): Promise<NormalizedDataResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false, // Extracts rows as 2D array to explicitly inspect row 1 for header validation
      dynamicTyping: true,
      skipEmptyLines: 'greedy',
      complete: async (results) => {
        try {
          // Yield before processing rows
          await new Promise((r) => setTimeout(r, 20));
          const rawRows = results.data as any[][];
          if (!rawRows || rawRows.length === 0) {
            return reject(new Error('The uploaded CSV file contains no data rows.'));
          }
          const result = await normalizeRowsWithHeaderValidation(rawRows, file.name);
          resolve(result);
        } catch (err: any) {
          reject(new Error(`Failed to process CSV: ${err.message}`));
        }
      },
      error: (error) => {
        reject(new Error(`CSV Parsing error: ${error.message}`));
      },
    });
  });
}

/**
 * 2. XLSX Parser using SheetJS
 * Extracts the first worksheet, extracts row 1 as headers, and performs fallback validation.
 */
async function parseXlsxFile(file: File): Promise<NormalizedDataResult> {
  const arrayBuffer = await file.arrayBuffer();
  // Yield main thread so the loading circle starts and maintains animation
  await new Promise((r) => setTimeout(r, 25));

  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  // Yield after reading workbook
  await new Promise((r) => setTimeout(r, 20));

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded Excel spreadsheet contains no worksheets.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  if (!worksheet) {
    throw new Error(`Could not read worksheet: ${firstSheetName}`);
  }

  // Convert first worksheet to 2D array of rows
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
    header: 1, // Extract as raw rows
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  // Yield before validating rows
  await new Promise((r) => setTimeout(r, 20));

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The worksheet contains no data rows.');
  }

  return await normalizeRowsWithHeaderValidation(rawRows, file.name);
}

/**
 * 3. JSON Parser with recursive flattening
 */
async function parseJsonFile(file: File): Promise<NormalizedDataResult> {
  const text = await file.text();
  let parsed: any;

  try {
    parsed = JSON.parse(text);
  } catch (err: any) {
    throw new Error(`Invalid JSON file format: ${err.message}`);
  }

  if (Array.isArray(parsed)) {
    // If it's a 2D array, run header validation
    if (parsed.length > 0 && Array.isArray(parsed[0])) {
      return await normalizeRowsWithHeaderValidation(parsed as any[][], file.name);
    }

    const itemsToFlatten: Record<string, any>[] = parsed;
    const flattenedRecords = itemsToFlatten.map((item) => flattenJsonObject(item));
    const { headers, matrix } = objectsToMatrix(flattenedRecords);

    return {
      records: flattenedRecords,
      headers,
      matrix,
      fileName: file.name,
    };
  } else if (typeof parsed === 'object' && parsed !== null) {
    // Single object: wrap in array
    const flattened = flattenJsonObject(parsed);
    const { headers, matrix } = objectsToMatrix([flattened]);
    return {
      records: [flattened],
      headers,
      matrix,
      fileName: file.name,
    };
  } else {
    throw new Error('Invalid JSON structure: Expected an array of objects or an object.');
  }
}
