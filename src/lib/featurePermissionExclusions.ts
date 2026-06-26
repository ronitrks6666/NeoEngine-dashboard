/**
 * Mirrors NeoManagerBackend conflict resolution for feature permissions.
 */
export type MutualExclusionZone = {
  id: string;
  label?: string;
  sideA: string[];
  sideB: string[];
  webKeys?: string[];
};

export type ManagerBundleFeature = {
  id: string;
  label: string;
  description?: string;
  managerKeys: string[];
  webKeys: string[];
};

export type WebOnlyFeature = {
  id: string;
  key: string;
  label: string;
  description?: string;
};

export function collectConflictKeys(zones: MutualExclusionZone[]): Set<string> {
  const s = new Set<string>();
  for (const z of zones) {
    for (const k of z.sideA) s.add(k);
    for (const k of z.sideB) s.add(k);
  }
  return s;
}

export function applyMutualExclusionZones(
  perms: Record<string, boolean | undefined>,
  zones: MutualExclusionZone[]
): Record<string, boolean> {
  const p: Record<string, boolean> = { ...perms } as Record<string, boolean>;
  for (const zone of zones) {
    const aOn = zone.sideA.some((k) => !!p[k]);
    const bOn = zone.sideB.some((k) => !!p[k]);
    if (bOn) {
      for (const k of zone.sideA) p[k] = false;
    } else if (aOn) {
      for (const k of zone.sideB) p[k] = false;
    }
  }
  return p;
}

/** If both sides off, turn staff side on (matches backend). */
export function enforceBinaryConflictZones(
  perms: Record<string, boolean | undefined>,
  zones: MutualExclusionZone[]
): Record<string, boolean> {
  const p: Record<string, boolean> = { ...perms } as Record<string, boolean>;
  for (const zone of zones) {
    const aOn = zone.sideA.some((k) => !!p[k]);
    const bOn = zone.sideB.some((k) => !!p[k]);
    if (!aOn && !bOn) {
      for (const k of zone.sideA) p[k] = true;
      for (const k of zone.sideB) p[k] = false;
    }
  }
  return p;
}

export function syncLinkedWebPermissions(
  perms: Record<string, boolean | undefined>,
  zones: MutualExclusionZone[],
  bundles: ManagerBundleFeature[]
): Record<string, boolean> {
  const p: Record<string, boolean> = { ...perms } as Record<string, boolean>;
  for (const zone of zones) {
    const webKeys = zone.webKeys ?? [];
    if (!webKeys.length) continue;
    const managerOn = zone.sideB.some((k) => !!p[k]);
    for (const wk of webKeys) p[wk] = managerOn;
  }
  for (const bundle of bundles) {
    const managerOn =
      bundle.managerKeys.length > 0
        ? bundle.managerKeys.some((k) => !!p[k])
        : bundle.webKeys.some((k) => !!p[k]);
    for (const k of bundle.managerKeys) p[k] = managerOn;
    for (const wk of bundle.webKeys) p[wk] = managerOn;
  }
  return p;
}

export function finalizeConflictPermissions(
  perms: Record<string, boolean | undefined>,
  zones: MutualExclusionZone[],
  bundles: ManagerBundleFeature[] = []
): Record<string, boolean> {
  let p = applyMutualExclusionZones(perms, zones);
  p = enforceBinaryConflictZones(p, zones);
  p = syncLinkedWebPermissions(p, zones, bundles);
  return p;
}

/** True if any manager-side key in this zone is on. */
export function getZoneMode(
  perms: Record<string, boolean | undefined>,
  zone: MutualExclusionZone
): 'staff' | 'manager' {
  return zone.sideB.some((k) => !!perms[k]) ? 'manager' : 'staff';
}

export function applyConflictZoneMode(
  perms: Record<string, boolean | undefined>,
  zones: MutualExclusionZone[],
  zoneId: string,
  mode: 'staff' | 'manager',
  bundles: ManagerBundleFeature[] = []
): Record<string, boolean> {
  const zone = zones.find((z) => z.id === zoneId);
  const p: Record<string, boolean> = { ...perms } as Record<string, boolean>;
  if (!zone) return finalizeConflictPermissions(p, zones, bundles);
  if (mode === 'staff') {
    for (const k of zone.sideA) p[k] = true;
    for (const k of zone.sideB) p[k] = false;
    for (const wk of zone.webKeys ?? []) p[wk] = false;
  } else {
    for (const k of zone.sideA) p[k] = false;
    for (const k of zone.sideB) p[k] = true;
    for (const wk of zone.webKeys ?? []) p[wk] = true;
  }
  return finalizeConflictPermissions(p, zones, bundles);
}

export function isBundleEnabled(
  perms: Record<string, boolean | undefined>,
  bundle: ManagerBundleFeature
): boolean {
  if (bundle.managerKeys.length > 0) {
    return bundle.managerKeys.some((k) => !!perms[k]);
  }
  return bundle.webKeys.some((k) => !!perms[k]);
}

export function setBundleEnabled(
  perms: Record<string, boolean | undefined>,
  bundle: ManagerBundleFeature,
  enabled: boolean,
  zones: MutualExclusionZone[],
  bundles: ManagerBundleFeature[]
): Record<string, boolean> {
  const p: Record<string, boolean> = { ...perms } as Record<string, boolean>;
  for (const k of bundle.managerKeys) p[k] = enabled;
  for (const wk of bundle.webKeys) p[wk] = enabled;
  return finalizeConflictPermissions(p, zones, bundles);
}

export function setWebOnlyFeature(
  perms: Record<string, boolean | undefined>,
  key: string,
  enabled: boolean,
  zones: MutualExclusionZone[],
  bundles: ManagerBundleFeature[]
): Record<string, boolean> {
  const p: Record<string, boolean> = { ...perms } as Record<string, boolean>;
  p[key] = enabled;
  return finalizeConflictPermissions(p, zones, bundles);
}
