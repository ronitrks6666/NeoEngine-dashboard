import * as XLSX from 'xlsx';

export type PayrollReportRow = {
  staffName: string;
  role: string;
  phone: string;
  upiId: string;
  panNumber: string;
  bankAccountNumber: string;
  ifscCode: string;
  bankName: string;
  totalHoursWorked: number;
  netPayable: number;
  paidAmount: number;
  remainingAmount: number;
  amount: number;
  bonuses: number;
  deductions: number;
  advances: number;
};

export type PayrollExportColumnKey = keyof PayrollReportRow;

export type PayrollExportColumn = {
  key: PayrollExportColumnKey;
  defaultLabel: string;
};

export const PAYROLL_EXPORT_COLUMNS: PayrollExportColumn[] = [
  { key: 'staffName', defaultLabel: 'Staff Name' },
  { key: 'bankAccountNumber', defaultLabel: 'Bank Account Number' },
  { key: 'ifscCode', defaultLabel: 'IFSC Code' },
  { key: 'bankName', defaultLabel: 'Bank Name' },
  { key: 'amount', defaultLabel: 'Amount' },
  { key: 'upiId', defaultLabel: 'UPI ID' },
  { key: 'phone', defaultLabel: 'Phone' },
  { key: 'role', defaultLabel: 'Role' },
  { key: 'panNumber', defaultLabel: 'PAN' },
  { key: 'netPayable', defaultLabel: 'Net Payable' },
  { key: 'paidAmount', defaultLabel: 'Paid Amount' },
  { key: 'remainingAmount', defaultLabel: 'Remaining Amount' },
  { key: 'totalHoursWorked', defaultLabel: 'Hours Worked' },
  { key: 'bonuses', defaultLabel: 'Bonuses' },
  { key: 'deductions', defaultLabel: 'Deductions' },
  { key: 'advances', defaultLabel: 'Advances' },
];

const STORAGE_PREFIX = 'neoengine:payroll-export-columns:';

export function payrollExportStorageKey(outletId: string) {
  return `${STORAGE_PREFIX}${outletId}`;
}

export function loadPayrollExportColumnLabels(outletId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(payrollExportStorageKey(outletId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function savePayrollExportColumnLabels(outletId: string, labels: Record<string, string>) {
  localStorage.setItem(payrollExportStorageKey(outletId), JSON.stringify(labels));
}

export function resolvePayrollExportColumnLabels(outletId: string) {
  const saved = loadPayrollExportColumnLabels(outletId);
  const labels: Record<PayrollExportColumnKey, string> = {} as Record<PayrollExportColumnKey, string>;

  for (const column of PAYROLL_EXPORT_COLUMNS) {
    const savedLabel = saved[column.key]?.trim();
    labels[column.key] = savedLabel || column.defaultLabel;
  }

  return labels;
}

function formatCellValue(key: PayrollExportColumnKey, value: unknown): string | number {
  if (typeof value === 'number') {
    if (key === 'totalHoursWorked') return Number(value.toFixed(2));
    return Number(value.toFixed(2));
  }
  if (typeof value === 'string') return value;
  return value == null ? '' : String(value);
}

export function downloadPayrollReportXlsx(options: {
  rows: PayrollReportRow[];
  columnLabels: Record<PayrollExportColumnKey, string>;
  filename: string;
  periodLabel?: string;
}) {
  const { rows, columnLabels, filename, periodLabel } = options;

  const headerRow = PAYROLL_EXPORT_COLUMNS.map((column) => columnLabels[column.key]);
  const dataRows = rows.map((row) =>
    PAYROLL_EXPORT_COLUMNS.map((column) => formatCellValue(column.key, row[column.key]))
  );

  const sheetRows: (string | number)[][] = [];
  if (periodLabel) {
    sheetRows.push(['Payroll period', periodLabel]);
    sheetRows.push(['Generated at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })]);
    sheetRows.push(['']);
  }
  sheetRows.push(headerRow, ...dataRows);

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll');
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
