import type { LucideIcon } from 'lucide-react';

export type OwnerNavItem = {
  key: string;
  to: string;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
};

export type FeatureMenuPrefRow = { key: string; enabled: boolean };

export function applyOwnerNavPreferences(
  items: OwnerNavItem[],
  prefs: FeatureMenuPrefRow[] | undefined
): OwnerNavItem[] {
  if (!prefs?.length) {
    return items;
  }
  const enabledMap = new Map(prefs.map((p) => [p.key, p.enabled !== false]));
  const order = prefs.map((p) => p.key);
  for (const item of items) {
    if (!order.includes(item.key)) order.push(item.key);
  }
  return order
    .map((key) => items.find((i) => i.key === key))
    .filter((item): item is OwnerNavItem => {
      if (!item) return false;
      if (item.locked) return true;
      return enabledMap.get(item.key) !== false;
    });
}
