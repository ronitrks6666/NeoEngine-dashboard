export function canAccessWebFeatureMenu(
  role: 'OWNER' | 'EMPLOYEE' | 'SUPER_ADMIN' | null,
  permissions: Record<string, boolean | undefined> | null | undefined
): boolean {
  if (role === 'OWNER' || role === 'SUPER_ADMIN') return true;
  if (role !== 'EMPLOYEE') return false;
  return !!permissions?.webFeatures;
}
