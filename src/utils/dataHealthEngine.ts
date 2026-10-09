import * as XLSX from 'xlsx';
import {
  RawTableData,
  DataHealthScanResult,
  DataHealthIssue,
  DataHealthSettings,
  SalesRecord,
} from '../types';
import { isOmniNull } from './omniNull';
import { cleanFloat } from './cleanFloat';

export { isOmniNull, cleanFloat };

/**
 * Determines whether a cell value represents a null, missing, or N/A value.
 * Uses Omni-Null detection: null, undefined, "", "   ", "NA", "N/A", "NaN", "-", or "null".
 */
export function isCellNullOrNA(cell: any): boolean {
  return isOmniNull(cell);
}

/**
 * Splits raw CSV/TSV text into a 2D string matrix
 */
export function rawCsvToMatrix(text: string): string[][] {
  if (!text || !text.trim()) return [];

  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return [];

  // Delimiter detection on first non-empty lines
  const sampleLine = lines[0];
  let delimiter = ',';
  const commaCount = (sampleLine.match(/,/g) || []).length;
  const semiCount = (sampleLine.match(/;/g) || []).length;
  const tabCount = (sampleLine.match(/\t/g) || []).length;
  const pipeCount = (sampleLine.match(/\|/g) || []).length;

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

  return lines.map(parseLine);
}

/**
 * Converts XLSX ArrayBuffer into a 2D string matrix
 */
export function rawXlsxToMatrix(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel workbook contains no sheets.');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  return matrix
    .filter((row) => Array.isArray(row) && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''))
    .map((row) => row.map((cell) => (cell !== null && cell !== undefined ? String(cell).trim() : '')));
}

/**
 * Converts JSON string into a 2D string matrix
 */
export function rawJsonToMatrix(text: string): { matrix: string[][]; headers: string[] } {
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
      for (const val of Object.values(data)) {
        if (Array.isArray(val) && val.length > 0) {
          rows = val;
          break;
        }
      }
    }
  }

  if (!rows || rows.length === 0) {
    throw new Error('No data records found in JSON.');
  }

  // Extract all unique keys across rows
  const keysSet = new Set<string>();
  rows.slice(0, 50).forEach((r) => {
    if (typeof r === 'object' && r !== null) {
      Object.keys(r).forEach((k) => keysSet.add(k));
    }
  });

  const headers = Array.from(keysSet);
  const matrix: string[][] = [headers];

  rows.forEach((r) => {
    if (typeof r === 'object' && r !== null) {
      matrix.push(headers.map((k) => (r[k] !== undefined && r[k] !== null ? String(r[k]) : '')));
    }
  });

  return { matrix, headers };
}

/**
 * Scans a 2D raw data matrix for pre-flight health issues:
 * 1. Decorative title headers (detecting true header row)
 * 2. Summary rows at table end (Totals / Averages)
 * 3. Missing numeric values
 * 4. Blank categorical values
 */
export function scanDataHealth(matrix: string[][]): DataHealthScanResult {
  if (matrix.length === 0) {
    throw new Error('Dataset is completely empty.');
  }

  const issues: DataHealthIssue[] = [];

  // --- ISSUE 1: Header Row Detection & Decorative Titles ---
  const maxHeaderCheck = Math.min(6, matrix.length);
  const headerCandidates: { index: number; preview: string[]; score: number; hasNumbers: boolean }[] = [];

  const commonHeaderKeywords = [
    'order', 'id', 'num', 'code', 'product', 'item', 'desc', 'description',
    'title', 'category', 'price', 'amount', 'cost', 'revenue', 'total',
    'sales', 'date', 'time', 'day', 'payment', 'method', 'channel', 'status',
    'qty', 'quantity', 'customer', 'region', 'unit', 'role', 'level', 'salary',
    'score', 'rate', 'budget', 'spend', 'employee', 'name', 'rank', 'percent',
    'percentage', 'route', 'destination', 'vehicle', 'fleet', 'crop', 'fees',
    'expense', 'fee', 'ngn'
  ];

  for (let i = 0; i < maxHeaderCheck; i++) {
    const row = matrix[i];
    const nonEmptyCells = row.filter((c) => c && c.trim().length > 0);
    let keywordScore = 0;
    let hasNumbers = false;

    nonEmptyCells.forEach((cell) => {
      const lower = cell.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (commonHeaderKeywords.some((kw) => lower.includes(kw))) {
        keywordScore += 3;
      }
      const clean = cell.replace(/[$€£¥₦,%\s]/g, '');
      if (!isNaN(Number(clean)) && clean !== '') {
        hasNumbers = true;
      } else {
        keywordScore += 1;
      }
    });

    const completeness = nonEmptyCells.length / Math.max(1, row.length);
    // Severe penalty if the candidate row contains numeric data: headers do not contain numeric rows!
    const score =
      (hasNumbers ? -200 : 0) +
      keywordScore * 2 +
      nonEmptyCells.length * 2 +
      completeness * 3;

    headerCandidates.push({
      index: i,
      preview: row.slice(0, 6),
      score,
      hasNumbers,
    });
  }

  let suggestedHeaderIndex = 0;
  let hasDecorativeHeader = false;

  // Check if row 0 is already a valid header row:
  // Row 0 has at least 2 non-empty columns, and does NOT have numeric data
  const row0Candidate = headerCandidates.find((c) => c.index === 0);
  const row0NonEmptyCount = matrix[0] ? matrix[0].filter((c) => c && c.trim().length > 0).length : 0;
  const row0HasNumbers = row0Candidate ? row0Candidate.hasNumbers : false;

  if (row0NonEmptyCount >= 2 && !row0HasNumbers) {
    // Row 0 is clean text with multiple columns: It is strictly the true header row!
    suggestedHeaderIndex = 0;
    hasDecorativeHeader = false;
  } else {
    // Only consider subsequent rows if row 0 had <= 1 column (e.g. single banner title)
    headerCandidates.sort((a, b) => b.score - a.score);
    const bestCandidate = headerCandidates.find((c) => !c.hasNumbers);

    if (bestCandidate && bestCandidate.index > 0 && row0NonEmptyCount <= 1) {
      suggestedHeaderIndex = bestCandidate.index;
      hasDecorativeHeader = true;
      issues.push({
        id: 'issue-decorative-header',
        type: 'DECORATIVE_HEADER',
        title: 'Decorative Title Row Detected',
        description: `Row 1 appears to be a document title ("${matrix[0].find((c) => c.trim().length > 0) || 'Untitled'}"). The true column headers start on Row ${suggestedHeaderIndex + 1}.`,
        affectedCount: suggestedHeaderIndex,
        detectedIndex: suggestedHeaderIndex,
        details: `Detected headers: ${matrix[suggestedHeaderIndex].filter((c) => c.trim().length > 0).slice(0, 4).join(', ')}...`,
      });
    }
  }

  const rawHeaders = matrix[suggestedHeaderIndex] || [];
  const normalizedHeaders = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Map key column indexes
  let orderIdx = normalizedHeaders.findIndex((h) =>
    h.includes('order') || h.includes('id') || h.includes('num') || h.includes('code') || h.includes('ref')
  );
  let prodIdx = normalizedHeaders.findIndex((h) =>
    h.includes('product') || h.includes('item') || h.includes('desc') || h.includes('title') || h.includes('name') || h.includes('category') || h.includes('route') || h.includes('role') || h.includes('crop')
  );
  let priceIdx = normalizedHeaders.findIndex((h) =>
    h.includes('price') || h.includes('amount') || h.includes('cost') || h.includes('revenue') || h.includes('total') || h.includes('value') || h.includes('sales') || h.includes('budget') || h.includes('spend') || h.includes('salary') || h.includes('fees') || h.includes('ngn')
  );
  let dateIdx = normalizedHeaders.findIndex((h) =>
    h.includes('date') || h.includes('time') || h.includes('day') || h.includes('period') || h.includes('month')
  );
  let payIdx = normalizedHeaders.findIndex((h) =>
    h.includes('pay') || h.includes('method') || h.includes('type') || h.includes('channel') || h.includes('status')
  );

  if (orderIdx === -1) orderIdx = 0;
  if (prodIdx === -1) prodIdx = normalizedHeaders.length > 1 ? 1 : 0;
  if (priceIdx === -1) priceIdx = normalizedHeaders.length > 2 ? 2 : (normalizedHeaders.length > 1 ? 1 : 0);
  if (dateIdx === -1) dateIdx = normalizedHeaders.length > 3 ? 3 : -1;
  if (payIdx === -1) payIdx = normalizedHeaders.length > 4 ? 4 : -1;

  // Data rows to scan (rows after header)
  const dataRowsStartIndex = suggestedHeaderIndex + 1;
  const dataRows = matrix.slice(dataRowsStartIndex);

  // --- ISSUE 2: Summary Rows at End of Table ---
  const summaryKeywords = /^(grand\s+)?(total|totals|average|avg|subtotal|sum|summary|overall|mean|all)\b/i;
  const summaryRowsFound: { index: number; label: string; values: string[] }[] = [];

  // Check the last 4 rows
  const bottomCheckRange = Math.min(5, dataRows.length);
  for (let b = dataRows.length - bottomCheckRange; b < dataRows.length; b++) {
    if (b < 0) continue;
    const r = dataRows[b];
    const absoluteRowIndex = dataRowsStartIndex + b;

    // Check cells for summary keyword
    const matchingCell = r.find((cell) => summaryKeywords.test(cell.trim()));
    if (matchingCell) {
      summaryRowsFound.push({
        index: absoluteRowIndex,
        label: matchingCell.trim(),
        values: r.slice(0, 5),
      });
    }
  }

  if (summaryRowsFound.length > 0) {
    issues.push({
      id: 'issue-summary-rows',
      type: 'SUMMARY_ROWS',
      title: 'Summary / Total Rows Detected at Table End',
      description: `Detected ${summaryRowsFound.length} summary row(s) containing "${summaryRowsFound.map((s) => s.label).join(', ')}" at the bottom. Including them would double-count totals and skew chart metrics.`,
      affectedCount: summaryRowsFound.length,
      sampleRows: summaryRowsFound.map((s) => s.index + 1),
      details: `Rows ${summaryRowsFound.map((s) => s.index + 1).join(', ')} contain aggregated totals.`,
    });
  }

  // --- ISSUE 3: Omni-Null Scanner & Smart Column Classification ---
  const summaryIndicesSet = new Set(summaryRowsFound.map((s) => s.index));

  // Smart Column Typing: Evaluate the majority of valid cells (ignoring Omni-Null cells)
  const columnClassifications: Record<number, 'numeric' | 'categorical'> = {};
  rawHeaders.forEach((_, cIdx) => {
    const validCells = dataRows
      .filter((_, idx) => !summaryIndicesSet.has(dataRowsStartIndex + idx))
      .map((r) => r[cIdx])
      .filter((c) => !isOmniNull(c));

    if (validCells.length === 0) {
      columnClassifications[cIdx] = 'categorical';
      return;
    }

    const numericCount = validCells.filter((c) => {
      const clean = String(c).replace(/[₦$£€¥,\s%]/g, '').replace(/\b(ngn|usd|gbp|eur)\b/gi, '');
      return !isNaN(Number(clean)) && clean !== '';
    }).length;

    if (numericCount / validCells.length >= 0.5) {
      columnClassifications[cIdx] = 'numeric';
    } else {
      columnClassifications[cIdx] = 'categorical';
    }
  });

  const omniNullRowsSet = new Set<number>();
  const missingNumericRowsSet = new Set<number>();
  const blankCategoricalRowsSet = new Set<number>();
  const validPrices: number[] = [];
  let naCellCount = 0;

  dataRows.forEach((r, idx) => {
    const absoluteRowIndex = dataRowsStartIndex + idx;
    if (summaryIndicesSet.has(absoluteRowIndex)) return;

    let rowHasOmniNull = false;

    // Check primary price metric column
    const primaryCell = r[priceIdx];
    if (!isOmniNull(primaryCell)) {
      const cleanNum = cleanFloat(primaryCell);
      if (!isNaN(cleanNum)) {
        validPrices.push(cleanNum);
      }
    }

    // Scan every cell against Omni-Null array
    rawHeaders.forEach((_, cIdx) => {
      const cell = r[cIdx];
      if (isOmniNull(cell)) {
        rowHasOmniNull = true;
        const strLower = String(cell || '').trim().toLowerCase();
        if (strLower === 'n/a' || strLower === 'na' || strLower === '#n/a' || strLower === 'nan') {
          naCellCount++;
        }
        if (columnClassifications[cIdx] === 'numeric') {
          missingNumericRowsSet.add(absoluteRowIndex);
        } else {
          blankCategoricalRowsSet.add(absoluteRowIndex);
        }
      }
    });

    if (rowHasOmniNull) {
      omniNullRowsSet.add(absoluteRowIndex);
    }
  });

  const omniNullRows = Array.from(omniNullRowsSet).sort((a, b) => a - b);
  const missingNumericRows = Array.from(missingNumericRowsSet).sort((a, b) => a - b);
  const blankCategoricalRows = Array.from(blankCategoricalRowsSet).sort((a, b) => a - b);

  // Calculate median price
  validPrices.sort((a, b) => a - b);
  let medianPrice = 0;
  if (validPrices.length > 0) {
    const mid = Math.floor(validPrices.length / 2);
    medianPrice = validPrices.length % 2 !== 0 ? validPrices[mid] : (validPrices[mid - 1] + validPrices[mid]) / 2;
  }

  if (missingNumericRows.length > 0) {
    const naDetail = naCellCount > 0 ? ` (${naCellCount} cells contain "N/A" or "n/a")` : '';
    issues.push({
      id: 'issue-missing-numeric',
      type: 'MISSING_NUMERIC',
      title: 'Null / N/A Values in Numeric Columns',
      description: `Found ${missingNumericRows.length} row(s) with blank, null, or N/A values${naDetail}.`,
      affectedCount: missingNumericRows.length,
      sampleRows: missingNumericRows.slice(0, 5).map((r) => r + 1),
      details: `Treated as nulls: values will be imputed with column medians, or entire rows can be removed.`,
    });
  }

  // --- ISSUE 4: Blank Categorical Values ---
  if (blankCategoricalRows.length > 0) {
    issues.push({
      id: 'issue-blank-categorical',
      type: 'BLANK_CATEGORICAL',
      title: 'Blank or N/A Categorical Labels',
      description: `Found ${blankCategoricalRows.length} row(s) with empty, null, or N/A values in categorical columns.`,
      affectedCount: blankCategoricalRows.length,
      sampleRows: blankCategoricalRows.slice(0, 5).map((r) => r + 1),
      details: 'Treated as nulls: can be labeled as "(Unspecified)" or excluded.',
    });
  }

  // Calculate health score (100 minus penalty per issue)
  const totalScanned = Math.max(1, dataRows.length);
  const penalty =
    (summaryRowsFound.length > 0 ? 10 : 0) +
    (hasDecorativeHeader ? 5 : 0) +
    Math.min(30, (missingNumericRows.length / totalScanned) * 45) +
    Math.min(25, (blankCategoricalRows.length / totalScanned) * 35);

  const initialHealthScore = Math.max(40, Math.round(100 - penalty));

  // Default recommended settings
  const recommendedSettings: DataHealthSettings = {
    headerRowIndex: suggestedHeaderIndex,
    excludeSummaryRows: summaryRowsFound.length > 0,
    summaryRowIndexes: summaryRowsFound.map((s) => s.index),
    numericMissingTreatment: 'median',
    categoricalBlankTreatment: 'unspecified',
  };

  return {
    totalRawRows: matrix.length,
    totalColumns: rawHeaders.length || (matrix[0] ? matrix[0].length : 0),
    headers: rawHeaders,
    suggestedHeaderIndex,
    hasDecorativeHeader,
    headerCandidates,
    summaryRows: summaryRowsFound,
    omniNullRows,
    missingNumericRows,
    medianPrice,
    blankCategoricalRows,
    columnClassifications,
    issues,
    initialHealthScore,
    recommendedSettings,
  };
}

/**
 * Applies the user-confirmed data health settings to transform raw matrix into clean SalesRecord[]
 */
export function applyHealthSettings(
  matrix: string[][],
  settings: DataHealthSettings,
  sourceName: string
): { records: SalesRecord[]; excludedCount: number; cleanHealthScore: number } {
  if (matrix.length === 0) return { records: [], excludedCount: 0, cleanHealthScore: 100 };

  const headerRowIndex = settings.headerRowIndex || 0;
  const rawHeaders = matrix[headerRowIndex] || [];
  const dataStart = headerRowIndex + 1;
  const summarySet = new Set(settings.excludeSummaryRows ? settings.summaryRowIndexes : []);

  const records: SalesRecord[] = [];
  let excludedCount = 0;

  for (let i = dataStart; i < matrix.length; i++) {
    // 1. Check summary rows exclusion
    if (summarySet.has(i)) {
      excludedCount++;
      continue;
    }

    const row = matrix[i];
    if (!row || row.every((c) => !c || c.trim().length === 0)) {
      excludedCount++;
      continue;
    }

    // 1:1 Non-destructive Mapping: Never mutate, alter, or fabricate random row content
    const recObj: any = {};
    rawHeaders.forEach((h, colIndex) => {
      if (h) {
        recObj[h] = row[colIndex] !== undefined && row[colIndex] !== null ? row[colIndex] : '';
      }
    });

    records.push(recObj);
  }

  // Health score after cleaning
  const cleanHealthScore = Math.min(
    100,
    Math.max(90, Math.round(100 - (excludedCount / Math.max(1, matrix.length)) * 20))
  );

  return { records, excludedCount, cleanHealthScore };
}

/**
 * Repairs a 2D matrix according to selected remediation mode:
 * 1. 'median': Drops summary rows, imputes medians for Numeric columns,
 *    and "(Unspecified)" for Categorical columns. Retains original formatting for all valid cells.
 * 2. 'remove_rows': Drops summary rows and removes any row containing Omni-Null cells.
 * 3. 'ignore': Retains raw records as-is without mutating.
 */
export function repairMatrixWithOptions(
  matrix: string[][],
  scanResult: DataHealthScanResult,
  mode: 'median' | 'remove_rows' | 'ignore' = 'median'
): { cleanMatrix: string[][]; appliedFixes: string[] } {
  if (matrix.length === 0) return { cleanMatrix: [], appliedFixes: [] };

  const headerIndex = scanResult.recommendedSettings.headerRowIndex;
  const headers = matrix[headerIndex] || [];
  const dataRows = matrix.slice(headerIndex + 1);
  const appliedFixes: string[] = [];

  // 1. If mode is "ignore", return raw data rows immediately without modification
  if (mode === 'ignore') {
    appliedFixes.push('Ignored pre-flight warnings and retained all raw records as-is');
    return { cleanMatrix: [headers, ...dataRows], appliedFixes };
  }

  // 2. Drop summary rows (e.g. "Total", "Average")
  const summaryIndexesSet = new Set(scanResult.summaryRows.map((s) => s.index));
  const filteredRows = dataRows.filter((_, idx) => {
    const absoluteIdx = headerIndex + 1 + idx;
    return !summaryIndexesSet.has(absoluteIdx);
  });

  if (scanResult.summaryRows.length > 0) {
    appliedFixes.push(`Dropped ${scanResult.summaryRows.length} summary row(s) from table end`);
  }

  const columnClassifications = scanResult.columnClassifications || {};

  // 3. Mode: "remove_rows" (Remove row with nulls entirely)
  if (mode === 'remove_rows') {
    let removedRowCount = 0;
    const completeRows = filteredRows.filter((row) => {
      const hasNull = row.some((cell) => isOmniNull(cell));
      if (hasNull) {
        removedRowCount++;
        return false;
      }
      return true;
    });

    appliedFixes.push(`Removed ${removedRowCount} row(s) containing null or missing values`);
    const cleanMatrix = [headers, ...completeRows];
    return { cleanMatrix, appliedFixes };
  }

  // 4. Mode: "median" (Impute medians for numeric columns, and "(Unspecified)" for categorical columns)
  const columnMedians: Record<number, number> = {};
  headers.forEach((_, colIdx) => {
    if (columnClassifications[colIdx] === 'numeric') {
      const validNums: number[] = [];
      filteredRows.forEach((row) => {
        const cell = row[colIdx];
        if (!isOmniNull(cell)) {
          const num = cleanFloat(cell);
          if (!isNaN(num)) {
            validNums.push(num);
          }
        }
      });

      if (validNums.length > 0) {
        validNums.sort((a, b) => a - b);
        const mid = Math.floor(validNums.length / 2);
        const median =
          validNums.length % 2 !== 0
            ? validNums[mid]
            : (validNums[mid - 1] + validNums[mid]) / 2;
        columnMedians[colIdx] = Math.round(median * 100) / 100;
      }
    }
  });

  let nullsImputedCount = 0;
  const repairedDataRows = filteredRows.map((row) => {
    return headers.map((_, colIdx) => {
      const cell = row[colIdx];
      if (isOmniNull(cell)) {
        nullsImputedCount++;
        if (columnClassifications[colIdx] === 'numeric') {
          return String(columnMedians[colIdx] ?? 0);
        } else {
          return '(Unspecified)';
        }
      }
      // CRITICAL: Retain original formatting for non-null cells (e.g., "$1,500", "₦4,200,000")!
      return cell;
    });
  });

  appliedFixes.push(
    `Imputed ${nullsImputedCount} missing value(s) (medians for numeric, "(Unspecified)" for categorical)`
  );

  const cleanMatrix = [headers, ...repairedDataRows];
  return { cleanMatrix, appliedFixes };
}

/**
 * Backward-compatible alias for median imputation
 */
export function repairMatrixWithRecommendedFixes(
  matrix: string[][],
  scanResult: DataHealthScanResult
): { cleanMatrix: string[][]; appliedFixes: string[] } {
  return repairMatrixWithOptions(matrix, scanResult, 'median');
}
