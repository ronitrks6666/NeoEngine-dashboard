import { useEffect, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import {
  PAYROLL_EXPORT_COLUMNS,
  downloadPayrollReportXlsx,
  resolvePayrollExportColumnLabels,
  savePayrollExportColumnLabels,
  type PayrollExportColumnKey,
  type PayrollReportRow,
} from '@/utils/payrollExport';

type Props = {
  open: boolean;
  outletId: string;
  periodLabel: string;
  filename: string;
  rows: PayrollReportRow[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
};

export function PayrollExportModal({
  open,
  outletId,
  periodLabel,
  filename,
  rows,
  loading = false,
  error = null,
  onClose,
}: Props) {
  const [labels, setLabels] = useState<Record<PayrollExportColumnKey, string>>(() =>
    resolvePayrollExportColumnLabels(outletId)
  );

  useEffect(() => {
    if (!open) return;
    setLabels(resolvePayrollExportColumnLabels(outletId));
  }, [open, outletId]);

  if (!open) return null;

  const handleDownload = () => {
    const trimmed: Record<PayrollExportColumnKey, string> = { ...labels };
    for (const column of PAYROLL_EXPORT_COLUMNS) {
      const value = labels[column.key]?.trim();
      trimmed[column.key] = value || column.defaultLabel;
    }
    savePayrollExportColumnLabels(outletId, trimmed);
    downloadPayrollReportXlsx({
      rows,
      columnLabels: trimmed,
      filename,
      periodLabel,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm">
      <div className="relative my-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl max-h-[90vh]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-2 text-gray-400 hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-gray-100 p-6 pr-14">
          <div className="flex items-center gap-2 text-emerald-700">
            <Download className="h-5 w-5" />
            <h2 className="text-xl font-semibold text-gray-900">Download payroll report</h2>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Review or update Excel column names for <span className="font-medium text-gray-800">{periodLabel}</span>.
            Your saved names are shown below and used on download.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading payroll data…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No staff payroll rows found for this period.
            </div>
          ) : (
            <div className="space-y-3">
              {PAYROLL_EXPORT_COLUMNS.map((column) => (
                <label key={column.key} className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    {column.defaultLabel}
                  </span>
                  <input
                    type="text"
                    value={labels[column.key] ?? column.defaultLabel}
                    onChange={(e) =>
                      setLabels((prev) => ({
                        ...prev,
                        [column.key]: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-emerald-500 focus:border-emerald-500 focus:ring-2"
                    placeholder={column.defaultLabel}
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading || !!error || rows.length === 0}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download Excel
          </button>
        </div>
      </div>
    </div>
  );
}
