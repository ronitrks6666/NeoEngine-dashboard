import { stripOutletPrefix } from './utils';

export type ParsedPayrollText = {
  periodStart: string;
  periodEnd: string;
  netPayable: number;
  recordsCount: number;
  paidAmount?: number;
  remainingAmount?: number;
};

export function parsePayrollFromText(text: string): ParsedPayrollText | null {
  const normalized = stripOutletPrefix(text.trim());
  const m = normalized.match(
    /(?:payroll:\s*)?latest period\s+([\d-]+)\s+to\s+([\d-]+)[,.\s]+net payable\s+([\d,.]+)[,.\s]+records\s+(\d+)(?:[,.\s]+paid\s+([\d,.]+))?(?:[,.\s]+remaining\s+([\d,.]+))?/i
  );
  if (!m) return null;
  return {
    periodStart: m[1],
    periodEnd: m[2],
    netPayable: Number(String(m[3]).replace(/,/g, '')) || 0,
    recordsCount: Number(m[4]) || 0,
    paidAmount: m[5] != null ? Number(String(m[5]).replace(/,/g, '')) || 0 : undefined,
    remainingAmount: m[6] != null ? Number(String(m[6]).replace(/,/g, '')) || 0 : undefined,
  };
}

export function formatCurrencyInr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function formatPayrollPeriodLabel(start: string, end: string) {
  try {
    const fmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
  } catch {
    return `${start} – ${end}`;
  }
}

export function buildPayrollBody(parsed: ParsedPayrollText) {
  return `Payroll: Latest period ${parsed.periodStart} to ${parsed.periodEnd}, net payable ${parsed.netPayable}, records ${parsed.recordsCount}.`;
}
