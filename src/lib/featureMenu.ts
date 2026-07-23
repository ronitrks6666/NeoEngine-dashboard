import type { LucideIcon } from 'lucide-react';

export type OwnerNavItem = {
  key: string;
  to: string;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
};

export type FeatureMenuPrefRow = { key: string; enabled: boolean };

/**
 * Apply outlet feature-menu prefs to sidebar items.
 * New keys missing from saved prefs default to enabled and insert at their
 * natural ownerNav position (not always appended at the end).
 */
export function applyOwnerNavPreferences(
  items: OwnerNavItem[],
  prefs: FeatureMenuPrefRow[] | undefined
): OwnerNavItem[] {
  if (!prefs?.length) {
    return items;
  }

  const itemByKey = new Map(items.map((item) => [item.key, item]));
  const enabledMap = new Map(prefs.map((p) => [p.key, p.enabled !== false]));
  const order: string[] = [];
  const seen = new Set<string>();

  for (const p of prefs) {
    if (!itemByKey.has(p.key) || seen.has(p.key)) continue;
    order.push(p.key);
    seen.add(p.key);
  }

  for (let i = 0; i < items.length; i++) {
    const key = items[i].key;
    if (seen.has(key)) continue;

    let insertAt = order.length;
    for (let j = i - 1; j >= 0; j--) {
      const idx = order.indexOf(items[j].key);
      if (idx !== -1) {
        insertAt = idx + 1;
        break;
      }
    }
    if (insertAt === order.length) {
      for (let j = i + 1; j < items.length; j++) {
        const idx = order.indexOf(items[j].key);
        if (idx !== -1) {
          insertAt = idx;
          break;
        }
      }
    }
    order.splice(insertAt, 0, key);
    seen.add(key);
  }

  return order
    .map((key) => itemByKey.get(key))
    .filter((item): item is OwnerNavItem => {
      if (!item) return false;
      if (item.locked) return true;
      // Missing from prefs ⇒ treat as enabled (new features)
      return enabledMap.get(item.key) !== false;
    });
}
