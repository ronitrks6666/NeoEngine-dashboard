import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { employeeApi } from '@/api/employee';
import { featurePermissionsApi } from '@/api/featurePermissions';
import {
  applyConflictZoneMode,
  getZoneMode,
  isBundleEnabled,
  setBundleEnabled,
  setWebOnlyFeature,
  type ManagerBundleFeature,
  type MutualExclusionZone,
  type WebOnlyFeature,
} from '@/lib/featurePermissionExclusions';
import { getApiErrorMessage } from '@/api/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  Shield,
  Loader2,
  Check,
  Undo2,
  ChevronDown,
  UsersRound,
  Search,
  Smartphone,
  Monitor,
} from 'lucide-react';

const BUNDLE_UI: Record<string, { title?: string; hint?: string }> = {
  people_management: {
    title: 'Staff, roles & attendance',
    hint: 'Turn on to allow creating staff and roles on the app and web (Staff, Roles, Hierarchy, Attendance, Duty Roster).',
  },
  outlets: {
    hint: 'Manage outlets on the app and web Outlets page, plus Rules & Regulations.',
  },
  issues: {
    hint: 'Issue tracker and Support on web.',
  },
};

const ZONE_UI: Record<string, { title: string; hint: string }> = {
  home_and_dashboard: {
    title: 'Home & dashboard',
    hint: 'Manager access enables the mobile manager home and web dashboard.',
  },
  tasks_stack: {
    title: 'Tasks & SOPs',
    hint: 'Manager access enables task management on the app and web (tasks, briefing pool, SOPs).',
  },
  money_payroll_overtime: {
    title: 'Payroll & overtime',
    hint: 'Manager access enables payroll and overtime tools on app and web.',
  },
  more_menu: {
    title: 'More menu',
    hint: 'Staff shortcuts vs manager shortcuts on mobile.',
  },
  activity_feed: {
    title: 'Activity',
    hint: 'Personal feed vs team activity — manager enables web activity page.',
  },
  leave: {
    title: 'Leave',
    hint: 'Apply leave vs approve and configure — manager enables web leave & events.',
  },
  analytics: {
    title: 'Analytics & reports',
    hint: 'Personal stats vs team analytics — manager enables web analytics and reports.',
  },
};

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

function outletRoleLabel(e: EmployeeRow): string | null {
  const ar = e.activeRoleId;
  if (!ar || typeof ar === 'string') return null;
  return (ar.name || '').trim() || null;
}

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
    return { id, title: masterTitle, searchHaystack: `${masterTitle} ${outletName}`.toLowerCase() };
  }
  return {
    id: `outlet:${outletName.toLowerCase()}`,
    title: outletName,
    searchHaystack: outletName.toLowerCase(),
  };
}

function TeamList({
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
      if (!map.has(meta.id)) map.set(meta.id, { id: meta.id, title: meta.title, members: [] });
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
  const prevGroupIdsRef = useRef('');

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

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <UsersRound className="h-5 w-5 text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-900">Team members</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(ev) => onSearchChange(ev.target.value)}
            placeholder="Search name or phone…"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>
      <div className="max-h-[min(420px,50vh)] overflow-y-auto">
        {listLoading && (
          <div className="flex justify-center py-12 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {!listLoading && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-500">No staff found</p>
        )}
        {groups.map((g) => {
          const open = roleOpen[g.id] !== false;
          return (
            <div key={g.id} className="border-b border-gray-50 last:border-0">
              <button
                type="button"
                onClick={() => setRoleOpen((prev) => ({ ...prev, [g.id]: !open }))}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50"
              >
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
                <span className="text-sm font-medium text-gray-800">{g.title}</span>
                <span className="text-xs text-gray-400">({g.members.length})</span>
              </button>
              {open && (
                <ul className="pb-2 px-2">
                  {g.members.map((e) => {
                    const active = selectedId === e._id;
                    const slot = outletRoleLabel(e);
                    return (
                      <li key={e._id}>
                        <button
                          type="button"
                          onClick={() => onSelect(e._id)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                            active ? 'bg-emerald-600 text-white' : 'hover:bg-gray-50 text-gray-900'
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              active ? 'bg-white/20' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {initials(e.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{e.name}</p>
                            {slot && (
                              <p className={`text-xs truncate ${active ? 'text-emerald-100' : 'text-gray-500'}`}>
                                {slot}
                              </p>
                            )}
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

function AccessToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-emerald-600' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function StaffManagerRow({
  title,
  hint,
  mode,
  onModeChange,
}: {
  title: string;
  hint: string;
  mode: 'staff' | 'manager';
  onModeChange: (m: 'staff' | 'manager') => void;
}) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div className="mb-2 sm:mb-0 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
      </div>
      <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shrink-0">
        <button
          type="button"
          onClick={() => onModeChange('staff')}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            mode === 'staff' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Staff
        </button>
        <button
          type="button"
          onClick={() => onModeChange('manager')}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            mode === 'manager' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Manager
        </button>
      </div>
    </div>
  );
}

export function PermissionsPage() {
  const { selectedOutletId } = useOutletStore();
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: catalogPack, isLoading: catalogLoading } = useQuery({
    queryKey: ['feature-permissions-catalog'],
    queryFn: () => featurePermissionsApi.getCatalog(),
  });

  const { data: empPayload, isLoading: listLoading } = useQuery({
    queryKey: ['my-employees', selectedOutletId, 'permissions'],
    queryFn: () =>
      employeeApi.getMyEmployees({
        outletId: selectedOutletId ?? undefined,
        limit: 300,
        includeInactive: true,
      }),
    enabled: !!selectedOutletId,
  });

  const employees = (empPayload?.data?.employees ?? []) as EmployeeRow[];

  const permQuery = useQuery({
    queryKey: ['employee-feature-permissions', selectedId],
    queryFn: () => featurePermissionsApi.getForEmployee(selectedId!),
    enabled: !!selectedId,
  });

  const zones = useMemo(
    () => catalogPack?.mutualExclusionZones ?? [],
    [catalogPack?.mutualExclusionZones]
  );
  const bundles = useMemo(
    () => catalogPack?.managerBundleFeatures ?? [],
    [catalogPack?.managerBundleFeatures]
  );
  const webOnly = useMemo(
    () => catalogPack?.webOnlyFeatures ?? [],
    [catalogPack?.webOnlyFeatures]
  );

  useEffect(() => {
    setSelectedId(null);
    setDraft({});
    setTeamSearch('');
  }, [selectedOutletId]);

  useLayoutEffect(() => {
    const fp = permQuery.data?.featurePermissions;
    if (fp && selectedId) setDraft(fp);
  }, [selectedId, permQuery.data?.featurePermissions]);

  const savedPermissions =
    permQuery.isSuccess && permQuery.data?.featurePermissions
      ? permQuery.data.featurePermissions
      : undefined;

  const permissionsDirty = useMemo(() => {
    if (!savedPermissions || !selectedId) return false;
    return !arePermissionMapsEqual(savedPermissions, draft);
  }, [savedPermissions, draft, selectedId]);

  const saveMutation = useMutation({
    mutationFn: () => featurePermissionsApi.update(selectedId!, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-feature-permissions', selectedId] });
      setSaveMsg({
        type: 'ok',
        text: 'Saved. App and web access update on next login or token refresh.',
      });
    },
    onError: (e) => {
      setSaveMsg({ type: 'err', text: getApiErrorMessage(e) });
    },
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Access permissions</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          Grant staff or manager access per feature. <strong>Manager</strong> access automatically enables the same
          feature on mobile and web — no separate toggles needed.
        </p>
      </div>

      {!selectedOutletId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Select an outlet in the header first.
        </div>
      )}

      {selectedOutletId && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <TeamList
              employees={employees}
              listLoading={listLoading}
              search={teamSearch}
              onSearchChange={setTeamSearch}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          <div className="lg:col-span-8 space-y-4">
            {!selectedId && (
              <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-500">
                <Shield className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Select a team member to manage their access</p>
              </div>
            )}

            {selectedId && permQuery.isLoading && (
              <div className="flex justify-center py-16 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}

            {selectedId && permQuery.isSuccess && catalogPack && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-600">
                    Changes apply to <span className="font-medium text-gray-900">mobile app</span> and{' '}
                    <span className="font-medium text-gray-900">web console</span> together.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!permissionsDirty || saveMutation.isPending}
                      onClick={() => {
                        if (savedPermissions) {
                          setSaveMsg(null);
                          setDraft({ ...savedPermissions });
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Reset
                    </button>
                    <button
                      type="button"
                      disabled={!permissionsDirty || saveMutation.isPending}
                      onClick={() => {
                        setSaveMsg(null);
                        saveMutation.mutate();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Save
                    </button>
                  </div>
                </div>

                {saveMsg && (
                  <div
                    className={`rounded-lg px-3 py-2 text-sm ${
                      saveMsg.type === 'ok'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {saveMsg.text}
                  </div>
                )}

                {catalogLoading && (
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </p>
                )}

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                    <Monitor className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-sm font-semibold text-gray-900">App & web (shared)</h2>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Choose Staff or Manager for each area. Manager turns on mobile manager tools and the matching web
                    screens.
                  </p>
                  <div>
                    {zones.map((z: MutualExclusionZone) => {
                      const ui = ZONE_UI[z.id] ?? { title: z.label || z.id, hint: '' };
                      return (
                        <StaffManagerRow
                          key={z.id}
                          title={ui.title}
                          hint={ui.hint}
                          mode={getZoneMode(draft, z)}
                          onModeChange={(mode) =>
                            setDraft((d) => applyConflictZoneMode(d, zones, z.id, mode, bundles))
                          }
                        />
                      );
                    })}
                  </div>
                </section>

                {bundles.length > 0 && (
                  <section className="rounded-xl border border-gray-200 bg-white p-4">
                    <h2 className="text-sm font-semibold text-gray-900 mb-1">Additional manager tools</h2>
                    <p className="text-xs text-gray-500 mb-3">
                      Extra manager capabilities. When enabled, linked web pages are included automatically.
                    </p>
                    {bundles.map((b: ManagerBundleFeature) => {
                      const ui = BUNDLE_UI[b.id];
                      return (
                      <AccessToggle
                        key={b.id}
                        label={ui?.title ?? b.label}
                        description={ui?.hint ?? b.description}
                        checked={isBundleEnabled(draft, b)}
                        onChange={(on) => setDraft((d) => setBundleEnabled(d, b, on, zones, bundles))}
                      />
                    );})}
                  </section>
                )}

                {webOnly.length > 0 && (
                  <section className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Monitor className="h-4 w-4 text-slate-600" />
                      <h2 className="text-sm font-semibold text-gray-900">Web only</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Screens that exist only on the web console — grant separately.
                    </p>
                    {webOnly.map((w: WebOnlyFeature) => (
                      <AccessToggle
                        key={w.id}
                        label={w.label}
                        description={w.description}
                        checked={!!draft[w.key]}
                        onChange={(on) => setDraft((d) => setWebOnlyFeature(d, w.key, on, zones, bundles))}
                      />
                    ))}
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
