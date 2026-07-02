/** Normalize pasted / typed Indian mobile input to up to 10 digits (no country code). */
export function normalizeIndianPhoneInput(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.length <= 10) return d.slice(0, 10);
  if (d.length >= 12 && d.startsWith('91')) {
    d = d.slice(2);
  } else if (d.length === 11 && d.startsWith('0')) {
    d = d.slice(1);
  }
  if (d.length > 10) {
    d = d.slice(-10);
  }
  return d.slice(0, 10);
}

export function normalizePhonesForSave(fields: string[]): string[] {
  return fields.map((p) => normalizeIndianPhoneInput(p)).filter((p) => p.length === 10);
}

export function phoneFieldFromStored(raw?: string): string {
  return normalizeIndianPhoneInput(String(raw || ''));
}
