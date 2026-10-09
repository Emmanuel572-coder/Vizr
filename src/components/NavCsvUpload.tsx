import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { SalesRecord } from '../types';
import { parseCSVToRecordsAsync, parseXLSXToRecords, parseJSONToRecords } from '../utils/dataImporter';

interface NavCsvUploadProps {
  onUploadSuccess: (records: SalesRecord[], fileName: string, mode: 'replace' | 'append') => void;
  onError: (message: string) => void;
}

export function NavCsvUpload({ onUploadSuccess, onError }: NavCsvUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingRecords, setPendingRecords] = useState<SalesRecord[] | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const fileName = file.name;
    const lower = fileName.toLowerCase();

    setIsProcessing(true);
    // Yield to main thread so UI updates immediately
    await new Promise((r) => setTimeout(r, 40));

    try {
      let parsed: SalesRecord[] = [];
      if (lower.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel') {
        const text = await file.text();
        parsed = await parseCSVToRecordsAsync(text);
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const buffer = await file.arrayBuffer();
        await new Promise((r) => setTimeout(r, 20));
        parsed = parseXLSXToRecords(buffer);
      } else if (lower.endsWith('.json') || file.type === 'application/json') {
        const text = await file.text();
        parsed = parseJSONToRecords(text);
      } else {
        onError('Please upload a valid .csv, .xlsx, or .json file.');
        setIsProcessing(false);
        return;
      }

      if (parsed.length === 0) {
        onError('Could not parse any valid transaction records from this file.');
        setIsProcessing(false);
        return;
      }

      setPendingRecords(parsed);
      setPendingFileName(file.name);
    } catch (err: any) {
      onError(`Failed to parse file: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleConfirm = (mode: 'replace' | 'append') => {
    if (pendingRecords) {
      onUploadSuccess(pendingRecords, pendingFileName, mode);
      setPendingRecords(null);
      setPendingFileName('');
    }
  };

  const handleCancel = () => {
    setPendingRecords(null);
    setPendingFileName('');
  };

  return (
    <>
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.json,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json"
        className="hidden"
        onChange={handleFileChange}
        id="navbar-csv-upload-input"
        aria-label="Upload CSV, XLSX, or JSON File"
      />

      {/* Navigation Bar Dropzone Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        title="Click to browse or drag & drop CSV, XLSX, or JSON files here"
        className={`group relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl border-2 border-dashed transition-all cursor-pointer select-none text-left ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/90 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm scale-[1.02]'
            : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/80 dark:bg-slate-800/80 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300'
        }`}
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            isDragOver
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500'
          }`}
        >
          <UploadCloud className="w-4 h-4 animate-in fade-in" />
        </div>

        <div className="flex flex-col pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold leading-tight">
              {isDragOver ? 'Drop CSV File Here' : 'Upload CSV'}
            </span>
            <span className="inline-block text-[10px] px-1.5 py-0.2 rounded font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-transparent dark:border-blue-800/50">
              Dropzone
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            {isProcessing ? 'Processing file...' : 'Drag & drop or click to browse'}
          </span>
        </div>
      </div>

      {/* Confirmation Dialog after CSV is dropped/selected */}
      {pendingRecords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Import CSV Data
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                    {pendingFileName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/60 mb-5 text-xs">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="font-semibold">Parsed Records:</span>
                <span className="font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-full border border-transparent dark:border-blue-800/40">
                  {pendingRecords.length} rows
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Choose how you want to load these records into your sales analytics dashboard:
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleConfirm('replace')}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold">Replace Current Dataset</div>
                  <div className="text-[11px] text-blue-100 font-normal">
                    Clear active records and visualize only this new CSV
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-200" />
              </button>

              <button
                type="button"
                onClick={() => handleConfirm('append')}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold">Append to Current Dataset</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    Keep existing records and merge these {pendingRecords.length} new records
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 shrink-0 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-center cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
