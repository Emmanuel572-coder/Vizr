import { useState, FormEvent } from 'react';
import { SalesRecord } from '../types';
import { parseCSVData } from '../data/initialData';
import { X, Plus, UploadCloud, AlertCircle } from 'lucide-react';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecord: (record: SalesRecord) => void;
  onImportCSV: (newRecords: SalesRecord[]) => void;
  availableProducts: string[];
}

export function AddRecordModal({
  isOpen,
  onClose,
  onAddRecord,
  onImportCSV,
  availableProducts,
}: AddRecordModalProps) {
  const [tab, setTab] = useState<'single' | 'csv'>('single');

  // Single record state
  const [orderNumber, setOrderNumber] = useState('');
  const [product, setProduct] = useState(availableProducts[0] || 'Slim-Fit Denim Jeans');
  const [customProduct, setCustomProduct] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'Credit Card' | 'Debit Card' | 'eWallet' | 'Cash'>('Credit Card');

  // CSV bulk state
  const [csvText, setCsvText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSingleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const finalProduct = product === 'CUSTOM' ? customProduct.trim() : product;
    const finalPrice = parseFloat(price);

    if (!orderNumber.trim()) {
      setErrorMsg('Please enter an Order Number (e.g. TT-1099)');
      return;
    }
    if (!finalProduct) {
      setErrorMsg('Please select or specify a Product name');
      return;
    }
    if (isNaN(finalPrice) || finalPrice <= 0) {
      setErrorMsg('Please enter a valid price greater than $0.00');
      return;
    }

    const newRecord: SalesRecord = {
      id: `record-custom-${Date.now()}-${Math.random()}`,
      orderNumber: orderNumber.trim(),
      product: finalProduct,
      price: finalPrice,
      date,
      paymentMethod,
    };

    onAddRecord(newRecord);
    onClose();
  };

  const handleCsvSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!csvText.trim()) {
      setErrorMsg('Please paste CSV text or enter records');
      return;
    }

    try {
      const parsed = parseCSVData(csvText);
      if (parsed.length === 0) {
        setErrorMsg('Could not parse any valid records. Format should be: Order Number,Product,Price,Date,Payment Method');
        return;
      }
      onImportCSV(parsed);
      onClose();
    } catch (err: any) {
      setErrorMsg(`Failed to parse CSV: ${err?.message || 'Invalid format'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Sales Data</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Insert a single entry or append a batch via CSV</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-4 border-b border-slate-100 dark:border-slate-800 flex gap-4">
          <button
            type="button"
            onClick={() => setTab('single')}
            className={`pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              tab === 'single'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Single Transaction
          </button>
          <button
            type="button"
            onClick={() => setTab('csv')}
            className={`pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              tab === 'csv'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Paste CSV Data
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Single Record Form */}
        {tab === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Order Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. TT-1099"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Price ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 88.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product
              </label>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {availableProducts.map((p) => (
                  <option key={p} value={p} className="dark:bg-slate-900">
                    {p}
                  </option>
                ))}
                <option value="CUSTOM" className="dark:bg-slate-900">+ Enter Custom Product Name...</option>
              </select>
              {product === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder="Enter custom product name"
                  value={customProduct}
                  onChange={(e) => setCustomProduct(e.target.value)}
                  className="w-full mt-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(
                      e.target.value as 'Credit Card' | 'Debit Card' | 'eWallet' | 'Cash'
                    )
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Credit Card" className="dark:bg-slate-900">Credit Card</option>
                  <option value="Debit Card" className="dark:bg-slate-900">Debit Card</option>
                  <option value="eWallet" className="dark:bg-slate-900">eWallet</option>
                  <option value="Cash" className="dark:bg-slate-900">Cash</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                Add Transaction
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCsvSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Paste CSV Lines (Header included)
              </label>
              <p className="text-slate-400 dark:text-slate-500 text-2xs mb-2">
                Format: Order Number,Product,Price,Date,Payment Method
              </p>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`Order Number,Product,Price,Date,Payment Method\nTT-1099,Slim-Fit Denim Jeans,$88.00,2025-10-08,Credit Card`}
                className="w-full font-mono text-2xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                Append CSV Data
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
