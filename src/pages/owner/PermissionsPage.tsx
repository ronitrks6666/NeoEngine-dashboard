import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { employeeApi } from '@/api/employee';
import {
  featurePermissionsApi,
  type CatalogItem,
  type CatalogSection,
} from '@/api/featurePermissions';
import {
  applyConflictZoneMode,
  collectConflictKeys,
  finalizeConflictPermissions,
  getZoneMode,
  type MutualExclusionZone,
} from '@/lib/featurePermissionExclusions';
import { getApiErrorMessage } from '@/api/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  Shield,
  Info,
  Loader2,
  Check,
  RotateCcw,
  ChevronDown,
  Sparkles,
  UsersRound,
  Search,
  ChevronsDownUp,
  ChevronsUpDown,
  ArrowLeftRight,
} from 'lucide-react';

const CONFLICT_ZONE_UI: Record<string, { title: string; hint: string }> = {
  home_and_dashboard: {
    title: 'Home & entry',
    hint: 'Staff punch home vs manager app shell / dashboard',
  },
  tasks_stack: {
    title: 'Tasks',
    hint: 'Assigned tasks vs manager hub, templates, analytics & briefing',
  },
  money_payroll_overtime: {
    title: 'Payroll & overtime',
    hint: 'Self-service vs manager payroll & overtime tools',
  },
  more_menu: {
    title: 'More menu',
    hint: 'Staff shortcuts vs manager shortcuts',
  },
  activity_feed: {
    title: 'Activity',
    hint: 'Personal feed vs team activity',
  },
  leave: {
    title: 'Leave',
    hint: 'Apply & track vs approve, assign & rules',
  },
  analytics: {
    title: 'Analytics',
    hint: 'Personal stats vs team / outlet analytics',
  },
};

function filterCatalogItem(item: CatalogItem, conflictKeys: Set<string>): CatalogItem | null {
  if (conflictKeys.has(item.key)) return null;
  if (!item.children?.length) return item;
  const children = item.children.filter((ch) => !conflictKeys.has(ch.key));
  if (children.length === 0) return { ...item, children: undefined };
  return { ...item, children };
}

function arePermissionMapsEqual(
  a: Record<string, boolean | undefined> | undefined,
  b: Record<string, boolean | undefined> | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (!!a[k] !== !!b[k]) return false;
  }
  return true;
}

type EmployeeRow = {
  _id: string;
  name: string;
  phone: string;
  activeRoleId?:
    | string
    | {
        _id?: string;
        name?: string;
        parentRoleId?: { _id?: string; name?: string } | string;
      };
};

/** Outlet-specific role label (Chef-1, GM-2, …) — shown per member, not as accordion group. */
function outletRoleLabel(e: EmployeeRow): string | null {
  const ar = e.activeRoleId;
  if (!ar || typeof ar === 'string') return null;
  const n = (ar.name || '').trim();
  return n || null;
}

/**
 * Group by master role (parentRoleId). Falls back to outlet role name if parent is missing.
 */
function roleGroupMeta(e: EmployeeRow): { id: string; title: string; searchHaystack: string } {
  const ar = e.activeRoleId;
  if (!ar || typeof ar === 'string') {
    return { id: '__unassigned', title: 'No role assigned', searchHaystack: 'no role unassigned' };
  }
  const outletName = (ar.name || '').trim() || 'Role';
  const parent = ar.parentRoleId;
  if (parent && typeof parent === 'object' && parent.name?.trim()) {
    const masterTitle = parent.name.trim();
    const id = parent._id ? `master:${String(parent._id)}` : `master:${masterTitle.toLowerCase()}`;
    return {
      id,
      title: masterTitle,
      searchHaystack: `${masterTitle} ${outletName}`.toLowerCase(),
    };
  }
  return {
    id: `outlet:${outletName.toLowerCase()}`,
    title: outletName,
    searchHaystack: outletName.toLowerCase(),
  };
}

function TeamByRolePanel({
  employees,
  listLoading,
  search,
  onSearchChange,
  selectedId,
  onSelect,
}: {
  employees: EmployeeRow[];
  listLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const debouncedSearch = useDebouncedValue(search, 280);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    if (!q) return employees;
    return employees.filter((e) => {
      const name = (e.name || '').toLowerCase();
      const phoneDigits = String(e.phone || '').replace(/\D/g, '');
      const { searchHaystack } = roleGroupMeta(e);
      if (name.includes(q)) return true;
      if (qDigits.length >= 3 && phoneDigits.includes(qDigits)) return true;
      if (searchHaystack.includes(q)) return true;
      return false;
    });
  }, [employees, debouncedSearch]);

  const groups = useMemo(() => {
    const map = new Map<string, { id: string; title: string; members: EmployeeRow[] }>();
    for (const e of filtered) {
      const meta = roleGroupMeta(e);
      if (!map.has(meta.id)) {
        map.set(meta.id, { id: meta.id, title: meta.title, members: [] });
      }
      map.get(meta.id)!.members.push(e);
    }
    const list = [...map.values()];
    list.sort((a, b) => {
      if (a.id === '__unassigned') return 1;
      if (b.id === '__unassigned') return -1;
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    });
    for (const g of list) {
      g.members.sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base' }));
    }
    return list;
  }, [filtered]);

  const [roleOpen, setRoleOpen] = useState<Record<string, boolean>>({});
  const prevGroupIdsRef = useRef<string>('');

  useEffect(() => {
    const sig = groups.map((g) => g.id).join('|');
    if (sig === prevGroupIdsRef.current) return;
    prevGroupIdsRef.current = sig;
    setRoleOpen((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        if (next[g.id] === undefined) next[g.id] = true;
      }
      return next;
    });
  }, [groups]);

  useEffect(() => {
    if (!selectedId) return;
    const g = groups.find((gr) => gr.members.some((m) => m._id === selectedId));
    if (g) setRoleOpen((prev) => ({ ...prev, [g.id]: true }));
  }, [selectedId, groups]);

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const g of groups) next[g.id] = true;
    setRoleOpen(next);
  };
  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    for (const g of groups) next[g.id] = false;
    setRoleOpen(next);
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-white to-emerald-50/40 shadow-md shadow-emerald-900/5 overflow-hidden ring-1 ring-emerald-100/80">
      <div className="px-4 pt-4 pb-3 border-b border-emerald-100/90 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-900/20">
            <UsersRound className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-emerald-950 tracking-tight">Team members</h2>
            <p className="text-[11px] text-emerald-600 font-medium">
              {listLoading
                ? 'Loading…'
                : `${filtered.length} shown · ${groups.length} master role${groups.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500/60" />
          <input
            type="search"
            value={search}
            onChange={(ev) => onSearchChange(ev.target.value)}
            placeholder="Name, phone, or role…"
            autoComplete="off"
            className="w-full rounded-xl border border-emerald-200/90 bg-emerald-50/50 py-2.5 pl-10 pr-3 text-sm text-emerald-950 placeholder:text-emerald-400/90 shadow-inner shadow-emerald-900/5 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition-colors"
            aria-label="Search team members"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100/80 transition-colors"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100/80 transition-colors"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
            Collapse all
          </button>
        </div>
      </div>

      <div className="max-h-[min(480px,55vh)] overflow-y-auto overscroll-contain">
        {listLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-emerald-700">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            Loading team…
          </div>
        )}
        {!listLoading && employees.length === 0 && (
          <div className="px-4 py-14 text-center">
            <p className="text-sm font-semibold text-emerald-900">No staff at this outlet</p>
            <p className="text-xs text-emerald-600 mt-1.5">Add people from the Staff page, then set permissions here.</p>
          </div>
        )}
        {!listLoading && employees.length > 0 && filtered.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-emerald-900">No matches</p>
            <p className="text-xs text-emerald-600 mt-1">Try another name, phone, or role.</p>
          </div>
        )}
        {!listLoading &&
          employees.length > 0 &&
          groups.map((g) => {
            const open = roleOpen[g.id] !== false;
            return (
              <div key={g.id} className="border-b border-emerald-100/70 last:border-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setRoleOpen((prev) => ({ ...prev, [g.id]: !open }))}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/70 transition-colors"
                >
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-emerald-600 transition-transform duration-200 ${
                      open ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-emerald-950 truncate">{g.title}</span>
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-emerald-800">
                        {g.members.length}
                      </span>
                    </div>
                    {g.id === '__unassigned' && (
                      <p className="text-[11px] text-amber-700/90 mt-0.5">Assign a role in Staff</p>
                    )}
                    {g.id !== '__unassigned' && g.id.startsWith('outlet:') && (
                      <p className="text-[11px] text-emerald-600/90 mt-0.5">No master role on file — grouped by outlet role</p>
                    )}
                  </div>
                </button>
                {open && (
                  <ul className="pb-2 px-2 space-y-1" role="list">
                    {g.members.map((e) => {
                      const active = selectedId === e._id;
                      const slot = outletRoleLabel(e);
                      return (
                        <li key={e._id}>
                          <button
                            type="button"
                            onClick={() => onSelect(e._id)}
                            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-150 ${
                              active
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/20 ring-1 ring-white/20'
                                : 'hover:bg-white/90 text-emerald-900 ring-1 ring-transparent hover:ring-emerald-200/60'
                            }`}
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                active
                                  ? 'bg-white/20 text-white'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {initials(e.name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-semibold truncate ${active ? 'text-white' : 'text-emerald-950'}`}>
                                {e.name}
                              </p>
                              {slot && (
                                <p
                                  className={`text-[10px] font-semibold truncate mt-0.5 ${
                                    active ? 'text-emerald-100/95' : 'text-emerald-700/85'
                                  }`}
                                >
                                  {slot}
                                </p>
                              )}
                              <p
                                className={`text-[11px] font-mono truncate mt-0.5 ${
                                  active ? 'text-emerald-100' : 'text-emerald-600'
                                }`}
                              >
                                {e.phone}
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  indent,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  indent?: boolean;
}) {
  const offVisual =
    'border border-slate-400/70 bg-slate-300/95 shadow-[inset_0_1px_2px_rgba(15,23,42,0.12)] hover:border-slate-400 hover:bg-slate-300';
  const onVisual =
    'border border-emerald-600/30 bg-emerald-500 shadow-[inset_0_1px_2px_rgba(6,78,59,0.2)] hover:bg-emerald-600';

  return (
    <div
      className={`flex items-start justify-between gap-4 py-3 border-b border-emerald-100/80 last:border-0 ${
        indent ? 'pl-4 ml-3 border-l-2 border-emerald-200/70' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-emerald-950">{label}</p>
        {description && (
          <p className="text-xs text-emerald-700/90 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(ev) => {
          if (disabled) return;
          if (ev.key === ' ' || ev.key === 'Enter') {
            ev.preventDefault();
            onChange(!checked);
          }
        }}
        className={`relative h-7 w-[2.875rem] shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
          checked ? onVisual : offVisual
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md ring-1 ring-slate-900/10 transition-transform duration-200 ease-out ${
            checked ? 'translate-x-[1.125rem]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function ConflictZonesPanel({
  zones,
  draft,
  setDraft,
}: {
  zones: MutualExclusionZone[];
  draft: Record<string, boolean>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-white shadow-sm shadow-emerald-900/5 overflow-hidden ring-1 ring-emerald-100/60">
      <div className="px-4 py-3.5 border-b border-emerald-100/90 bg-gradient-to-r from-emerald-50/90 to-white">
        <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <ArrowLeftRight className="h-4 w-4" />
          </span>
          Staff vs manager
        </h3>
        <p className="text-xs text-emerald-700 mt-2 leading-relaxed max-w-3xl">
          These areas overlap on the phone: only one side can be on. Pick <span className="font-semibold">Staff</span> for
          the employee experience, or <span className="font-semibold">Manager</span> for owner-style tools in that area.
          Turning one on turns the other off automatically.
        </p>
      </div>
      <ul className="divide-y divide-emerald-100/80" role="list">
        {zones.map((z) => {
          const ui = CONFLICT_ZONE_UI[z.id] ?? { title: z.label || z.id, hint: '' };
          const mode = getZoneMode(draft, z);
          return (
            <li key={z.id} className="px-4 py-3.5 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0 mb-3 sm:mb-0">
                <p className="text-sm font-semibold text-emerald-950">{ui.title}</p>
                {ui.hint && <p className="text-[11px] text-emerald-600/95 mt-0.5 leading-snug">{ui.hint}</p>}
              </div>
              <div
                className="inline-flex rounded-full border border-emerald-200/90 bg-emerald-50/60 p-0.5 shrink-0 shadow-inner shadow-emerald-900/5"
                role="group"
                aria-label={`${ui.title}: staff or manager`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => applyConflictZoneMode(d, zones, z.id, 'staff'))
                  }
                  className={`rounded-full px-3.5 py-2 text-xs font-bold transition-all min-w-[5.5rem] ${
                    mode === 'staff'
                      ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200/80'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  Staff
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => applyConflictZoneMode(d, zones, z.id, 'manager'))
                  }
                  className={`rounded-full px-3.5 py-2 text-xs font-bold transition-all min-w-[5.5rem] ${
                    mode === 'manager'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  Manager
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CatalogSectionBlock({
  section,
  draft,
  setDraft,
  open,
  onToggleOpen,
  zones,
}: {
  section: CatalogSection;
  draft: Record<string, boolean>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  open: boolean;
  onToggleOpen: () => void;
  zones: MutualExclusionZone[];
}) {
  const renderItem = (item: CatalogItem, indent?: boolean) => (
    <div key={item.key}>
      <ToggleRow
        label={item.label}
        description={item.description}
        indent={indent}
        checked={!!draft[item.key]}
        onChange={(next) =>
          setDraft((d) => finalizeConflictPermissions({ ...d, [item.key]: next }, zones))
        }
      />
      {item.children?.map((ch) => renderItem(ch, true))}
    </div>
  );

  return (
    <div className="rounded-2xl border border-emerald-100/90 bg-white/90 shadow-sm shadow-emerald-900/5 overflow-hidden">
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left bg-gradient-to-r from-emerald-50/90 to-white hover:from-emerald-50 transition-colors"
      >
        <div>
          <h3 className="text-sm font-bold text-emerald-900 tracking-tight">{section.group}</h3>
          {section.description && (
            <p className="text-xs text-emerald-700/85 mt-0.5">{section.description}</p>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-emerald-600 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && <div className="px-4 pb-2">{section.items.map((it) => renderItem(it))}</div>}
    </div>
  );
}

export function PermissionsPage() {
  const { selectedOutletId } = useOutletStore();
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const catalogOpenInitRef = useRef(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: catalogPack, isLoading: catalogLoading } = useQuery({
    queryKey: ['feature-permissions-catalog'],
    queryFn: () => featurePermissionsApi.getCatalog(),
  });

  const { data: empPayload, isLoading: listLoading } = useQuery({
    queryKey: ['my-employees', selectedOutletId, 'permissions-by-role'],
    queryFn: () =>
      employeeApi.getMyEmployees({
        outletId: selectedOutletId ?? undefined,
        limit: 300,
      }),
    enabled: !!selectedOutletId,
  });

  const employees = (empPayload?.data?.employees ?? []) as EmployeeRow[];

  const permQuery = useQuery({
    queryKey: ['employee-feature-permissions', selectedId],
    queryFn: () => featurePermissionsApi.getForEmployee(selectedId!),
    enabled: !!selectedId,
  });

  const exclusionZones = useMemo(
    () => catalogPack?.mutualExclusionZones ?? [],
    [catalogPack?.mutualExclusionZones]
  );

  const filteredCatalog = useMemo(() => {
    if (!catalogPack?.catalog) return [];
    const ck = collectConflictKeys(exclusionZones);
    return catalogPack.catalog
      .map((section) => ({
        ...section,
        items: section.items
          .map((it) => filterCatalogItem(it, ck))
          .filter((x): x is CatalogItem => x != null),
      }))
      .filter((s) => s.items.length > 0);
  }, [catalogPack?.catalog, exclusionZones]);

  useEffect(() => {
    setSelectedId(null);
    setDraft({});
    setTeamSearch('');
  }, [selectedOutletId]);

  useLayoutEffect(() => {
    const fp = permQuery.data?.featurePermissions;
    if (fp && selectedId) {
      setDraft(fp);
    }
  }, [selectedId, permQuery.data?.featurePermissions]);

  const savedPermissions =
    permQuery.isSuccess && permQuery.data?.featurePermissions ? permQuery.data.featurePermissions : undefined;

  const permissionsDirty = useMemo(() => {
    if (!savedPermissions || !selectedId) return false;
    return !arePermissionMapsEqual(savedPermissions, draft);
  }, [savedPermissions, draft, selectedId]);

  useEffect(() => {
    if (!filteredCatalog.length || catalogOpenInitRef.current) return;
    catalogOpenInitRef.current = true;
    const next: Record<string, boolean> = {};
    for (const s of filteredCatalog) next[s.group] = true;
    setOpenSections(next);
  }, [filteredCatalog]);

  const saveMutation = useMutation({
    mutationFn: () => featurePermissionsApi.update(selectedId!, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-feature-permissions', selectedId] });
      setSaveMsg({ type: 'ok', text: 'Saved — the app will receive these flags on next login or token refresh.' });
    },
    onError: (e) => {
      setSaveMsg({ type: 'err', text: getApiErrorMessage(e) });
    },
  });

  const authKeysText = useMemo(
    () => (catalogPack?.authAlwaysTrueKeys?.length ? catalogPack.authAlwaysTrueKeys.join(', ') : ''),
    [catalogPack?.authAlwaysTrueKeys]
  );

  const enableAllToggles = () => {
    if (!catalogPack?.catalog) return;
    setDraft((prev) => {
      const next = { ...prev };
      for (const section of catalogPack.catalog) {
        for (const item of section.items) {
          next[item.key] = true;
          if (item.children) {
            for (const ch of item.children) next[ch.key] = true;
          }
        }
      }
      return finalizeConflictPermissions(next, exclusionZones);
    });
  };

  const toggleSection = (group: string) => {
    setOpenSections((s) => ({ ...s, [group]: !s[group] }));
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in pb-24">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 px-6 py-8 sm:px-10 sm:py-10 text-white shadow-xl shadow-emerald-950/20 mb-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-teal-400/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-100">
              <Sparkles className="h-3.5 w-3.5" />
              Mobile access
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">Feature permissions</h1>
            <p className="mt-2 max-w-xl text-sm sm:text-base text-emerald-100/90 leading-relaxed">
              Choose a team member, then grant manager areas as needed. By default, everyone except owners gets{' '}
              <span className="font-semibold text-white">staff</span> screens only (home, tasks, payroll, more, etc.);
              <span className="font-semibold text-white"> manager</span> sections stay off until you enable them here.
              Use the <span className="font-semibold text-white">Staff vs manager</span> section for overlapping areas;
              other toggles are below. API keys use <span className="font-semibold text-white">staff…</span> /{' '}
              <span className="font-semibold text-white">manager…</span> prefixes. Login returns{' '}
              <span className="font-semibold text-white">featurePermissions</span> for the app.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-black/20 px-4 py-3 ring-1 ring-white/10">
            <Shield className="h-8 w-8 text-emerald-200 shrink-0" />
            <p className="text-xs text-emerald-50/95 leading-snug max-w-[200px]">
              Owners always have full access. New staff default to the staff app; you turn on manager tools per person.
            </p>
          </div>
        </div>
      </div>

      {!selectedOutletId && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 text-sm">
          Select an outlet in the header to manage permissions for that location&apos;s staff.
        </div>
      )}

      {selectedOutletId && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          <div className="xl:col-span-4 space-y-4">
            <TeamByRolePanel
              employees={employees}
              listLoading={listLoading}
              search={teamSearch}
              onSearchChange={setTeamSearch}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/90 p-4 flex gap-3">
              <Info className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <p className="font-semibold text-emerald-950 mb-1">Defaults</p>
                <p>
                  New staff get <code className="text-[11px] bg-white/90 px-1 rounded">staff…</code> on and{' '}
                  <code className="text-[11px] bg-white/90 px-1 rounded">manager…</code> off until you change them.
                  Overlapping staff/manager areas are controlled in the <strong>Staff vs manager</strong> block on the
                  right — one side stays on at a time.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 flex gap-3">
              <Info className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
              <div className="text-xs text-sky-900 leading-relaxed">
                <p className="font-semibold text-sky-950 mb-1">Sign-in screens stay available</p>
                <p>
                  These keys are always <code className="text-[11px] bg-white/80 px-1 rounded">true</code> in the API so
                  users can log in and complete security steps: {authKeysText || '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="xl:col-span-8 space-y-4">
            {!selectedId && (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/60 px-6 py-16 text-center">
                <Shield className="h-10 w-10 text-emerald-300 mx-auto mb-3" />
                <p className="text-emerald-900 font-semibold">Select someone from the list</p>
                <p className="text-sm text-emerald-700 mt-1 max-w-md mx-auto">
                  Their current flags load from the server. Changes apply to the mobile app on the next login or refresh
                  token call.
                </p>
              </div>
            )}

            {selectedId && permQuery.isLoading && (
              <div className="flex items-center justify-center py-20 text-emerald-700 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading permissions…
              </div>
            )}

            {selectedId && permQuery.isError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {getApiErrorMessage(permQuery.error)}
              </div>
            )}

            {selectedId && permQuery.isSuccess && catalogPack && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-emerald-950 tracking-tight">Permissions</h2>
                    <p className="text-xs text-emerald-700 mt-1 max-w-xl leading-relaxed">
                      Set staff vs manager for overlapping screens first, then adjust other areas. Save sends everything
                      to the API.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={enableAllToggles}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Enable all
                    </button>
                    <button
                      type="button"
                      disabled={saveMutation.isPending || !permissionsDirty}
                      onClick={() => {
                        if (!permissionsDirty) return;
                        setSaveMsg(null);
                        saveMutation.mutate();
                      }}
                      title={!permissionsDirty ? 'No changes to save' : undefined}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                        saveMutation.isPending || !permissionsDirty
                          ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                          : 'bg-emerald-600 text-white shadow-md shadow-emerald-900/15 hover:bg-emerald-500'
                      }`}
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Save changes
                    </button>
                  </div>
                </div>

                {saveMsg && (
                  <div
                    className={`rounded-xl px-4 py-2.5 text-sm ${
                      saveMsg.type === 'ok'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {saveMsg.text}
                  </div>
                )}

                {catalogLoading && (
                  <p className="text-sm text-emerald-700 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading catalog…
                  </p>
                )}

                <ConflictZonesPanel zones={exclusionZones} draft={draft} setDraft={setDraft} />

                <div className="pt-2">
                  <h3 className="text-sm font-bold text-emerald-950">Other areas</h3>
                  <p className="text-[11px] text-emerald-600 mt-0.5 mb-3">
                    No staff vs manager overlap here — toggle features independently. Nested items are extra detail
                    (e.g. task tabs).
                  </p>
                  <div className="space-y-3">
                    {filteredCatalog.map((section: CatalogSection) => (
                      <CatalogSectionBlock
                        key={section.group}
                        section={section}
                        draft={draft}
                        setDraft={setDraft}
                        open={openSections[section.group] !== false}
                        onToggleOpen={() => toggleSection(section.group)}
                        zones={exclusionZones}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
