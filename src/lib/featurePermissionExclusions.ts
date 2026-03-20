/**
 * Mirrors NeoManagerBackend conflict resolution for feature permissions.
 */
export type MutualExclusionZone = {
  id: string;
  label?: string;
  sideA: string[];
  sideB: string[];
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

export function finalizeConflictPermissions(
  perms: Record<string, boolean | undefined>,
  zones: MutualExclusionZone[]
): Record<string, boolean> {
  let p = applyMutualExclusionZones(perms, zones);
  p = enforceBinaryConflictZones(p, zones);
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
  mode: 'staff' | 'manager'
): Record<string, boolean> {
  const zone = zones.find((z) => z.id === zoneId);
  const p: Record<string, boolean> = { ...perms } as Record<string, boolean>;
  if (!zone) return finalizeConflictPermissions(p, zones);
  if (mode === 'staff') {
    for (const k of zone.sideA) p[k] = true;
    for (const k of zone.sideB) p[k] = false;
  } else {
    for (const k of zone.sideA) p[k] = false;
    for (const k of zone.sideB) p[k] = true;
  }
  return finalizeConflictPermissions(p, zones);
}
