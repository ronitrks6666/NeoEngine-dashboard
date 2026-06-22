export const BILLING_CYCLE_OPTIONS = [
  { value: 1, label: '1 month' },
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' },
] as const;

export function billingCycleLabel(months: number): string {
  const found = BILLING_CYCLE_OPTIONS.find((o) => o.value === months);
  return found?.label ?? `${months} month${months === 1 ? '' : 's'}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
