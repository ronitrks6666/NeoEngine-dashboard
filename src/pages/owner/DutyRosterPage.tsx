import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { employeeApi, type DutyRosterRow, type DutyRosterRoleSchedule } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListSearchBar } from '@/components/ListSearchBar';
import { SmartTimeInput } from '@/components/SmartTimeInput';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  formatTime12,
  parseFlexibleTimeDigits,
  parseHHmm,
} from '@/utils/taskScheduleUtils';
import { Briefcase, CalendarClock, ChevronDown, Pencil, Sparkles, Users, X } from 'lucide-react';

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const MAX_WEEKLY_OFF = 3;

type EditModal = 'time' | 'hours' | 'role' | 'weeklyOff' | null;
type BulkApplyMode = 'set_all_staff' | 'outlet_default_only';

function normalizePunchTime(raw: string): string | null {
  return parseFlexibleTimeDigits(raw) ?? (parseHHmm(raw) != null ? raw.trim() : null);
}

function sortWeekdays(days: string[]) {
  return WEEKDAYS.filter((d) => days.includes(d));
}

function sourceLabel(source: 'employee' | 'role' | 'outlet') {
  if (source === 'role') return 'From role default';
  if (source === 'outlet') return 'From outlet default';
  return 'Custom for this staff';
}

function formatWeeklyOff(days: string[]) {
  const sorted = sortWeekdays(days);
  if (sorted.length === 0) return 'Not set';
  return sorted.map((d) => d.slice(0, 3)).join(', ');
}

function formatRosterTime(value?: string | null) {
  if (!value) return '—';
  const normalized =
    parseFlexibleTimeDigits(value) ?? (parseHHmm(value) != null ? value : null);
  if (normalized) return formatTime12(normalized);
  return value;
}

function EditableCell({
  label,
  value,
  hint,
  onClick,
  disabled,
}: {
  label: string;
  value: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group w-full min-w-[8.5rem] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:border-emerald-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="mt-1 flex items-center justify-between gap-2">
        <span className="text-base font-bold text-gray-900 tabular-nums">{value}</span>
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 group-hover:bg-emerald-100">
          <Pencil className="h-3 w-3" />
          Edit
        </span>
      </span>
      {hint ? <span className="mt-1 block text-[11px] leading-snug text-gray-500">{hint}</span> : null}
    </button>
  );
}

export function DutyRosterPage() {
  const { selectedOutletId } = useOutletStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [editRow, setEditRow] = useState<DutyRosterRow | null>(null);
  const [editModal, setEditModal] = useState<EditModal>(null);
  const [timeDraft, setTimeDraft] = useState('');
  const [timeUsesDefault, setTimeUsesDefault] = useState(true);
  const [hoursDraft, setHoursDraft] = useState('');
  const [hoursUsesDefault, setHoursUsesDefault] = useState(true);
  const [weeklyOffDraft, setWeeklyOffDraft] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [bulkPunch, setBulkPunch] = useState('');
  const [bulkHours, setBulkHours] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [bulkConfirmMode, setBulkConfirmMode] = useState<BulkApplyMode | null>(null);
  const [rolePanelOpen, setRolePanelOpen] = useState(true);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<
    Record<string, { punchInTime: string; minHoursPerDay: string }>
  >({});
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['duty-roster', selectedOutletId, debouncedSearch],
    queryFn: async () => {
      const res = await employeeApi.getDutyRoster({
        outletId: selectedOutletId!,
        search: debouncedSearch.trim() || undefined,
      });
      const payload = res?.data ?? res;
      return {
        roster: (payload?.roster ?? []) as DutyRosterRow[],
        roleSchedules: (payload?.roleSchedules ?? []) as DutyRosterRoleSchedule[],
        outletDefaults: payload?.outletDefaults as
          | { punchInTime: string; minHoursPerDay: number }
          | undefined,
        outletName: payload?.outletName as string | undefined,
      };
    },
    enabled: !!selectedOutletId,
  });

  const { data: parentRolesData, isLoading: parentRolesLoading } = useQuery({
    queryKey: ['parent-roles'],
    queryFn: () => employeeApi.getParentRoles(),
    enabled: editModal === 'role',
  });

  const parentRoles = useMemo(() => {
    const list = parentRolesData?.data?.parentRoles ?? [];
    return Array.isArray(list) ? list : [];
  }, [parentRolesData]);

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; payload: Record<string, unknown> }) =>
      employeeApi.update(args.id, args.payload),
    onSuccess: () => {
      setSaveError(null);
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['duty-roster', selectedOutletId] });
    },
    onError: (e) => setSaveError(getApiErrorMessage(e)),
  });

  const bulkMutation = useMutation({
    mutationFn: (payload: {
      outletId: string;
      punchInTime: string;
      minHoursPerDay: number;
      applyMode: BulkApplyMode;
    }) => employeeApi.applyDutyRosterBulk(payload),
    onSuccess: (_data, variables) => {
      setBulkError(null);
      setBulkConfirmMode(null);
      setBulkSuccess(
        variables.applyMode === 'set_all_staff'
          ? 'Shift hours updated for whole team'
          : 'Outlet shift default saved'
      );
      queryClient.invalidateQueries({ queryKey: ['duty-roster', selectedOutletId] });
    },
    onError: (e) => {
      setBulkConfirmMode(null);
      setBulkError(getApiErrorMessage(e));
    },
  });

  const roleScheduleMutation = useMutation({
    mutationFn: (payload: {
      outletId: string;
      parentRoleId: string;
      punchInTime: string;
      minHoursPerDay: number;
    }) => employeeApi.applyDutyRosterRoleSchedule(payload),
    onSuccess: (_data, variables) => {
      setRoleError(null);
      setSavingRoleId(null);
      const name =
        data?.roleSchedules?.find((r) => r.parentRoleId === variables.parentRoleId)
          ?.parentRoleName || 'Role';
      setRoleSuccess(
        `${name}: clock-in ${formatRosterTime(variables.punchInTime)} · ${variables.minHoursPerDay}h saved for all staff in this role (custom staff overrides kept).`
      );
      setRoleDrafts((prev) => {
        const next = { ...prev };
        delete next[variables.parentRoleId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['duty-roster', selectedOutletId] });
    },
    onError: (e) => {
      setSavingRoleId(null);
      setRoleError(getApiErrorMessage(e));
    },
  });

  // Clear drafts when switching outlets so role times reload cleanly
  useEffect(() => {
    setRoleDrafts({});
    setExpandedRoleId(null);
    setRoleError(null);
    setRoleSuccess(null);
  }, [selectedOutletId]);

  const closeModal = useCallback(() => {
    setEditModal(null);
    setEditRow(null);
    setSaveError(null);
  }, []);

  const openTimeModal = (row: DutyRosterRow) => {
    const usesDefault = row.punchInTime == null;
    setEditRow(row);
    setTimeUsesDefault(usesDefault);
    setTimeDraft(usesDefault ? row.effectivePunchInTime : row.punchInTime!);
    setEditModal('time');
    setSaveError(null);
  };

  const openHoursModal = (row: DutyRosterRow) => {
    const usesDefault = row.minHoursPerDay == null;
    setEditRow(row);
    setHoursUsesDefault(usesDefault);
    setHoursDraft(String(usesDefault ? row.effectiveMinHoursPerDay : row.minHoursPerDay));
    setEditModal('hours');
    setSaveError(null);
  };

  const openRoleModal = (row: DutyRosterRow) => {
    setEditRow(row);
    setEditModal('role');
    setSaveError(null);
  };

  const openWeeklyOffModal = (row: DutyRosterRow) => {
    setEditRow(row);
    setWeeklyOffDraft(sortWeekdays(row.weeklyOffDays ?? []));
    setEditModal('weeklyOff');
    setSaveError(null);
  };

  const saveTime = () => {
    if (!editRow) return;
    updateMutation.mutate({
      id: editRow.id,
      payload: { punchInTime: timeUsesDefault ? null : timeDraft },
    });
  };

  const saveHours = () => {
    if (!editRow) return;
    if (!hoursUsesDefault) {
      const n = parseInt(hoursDraft, 10);
      if (!hoursDraft.trim() || n < 1 || n > 24) {
        setSaveError('Hours must be between 1 and 24');
        return;
      }
    }
    updateMutation.mutate({
      id: editRow.id,
      payload: { minHoursPerDay: hoursUsesDefault ? null : parseInt(hoursDraft, 10) },
    });
  };

  const saveRole = (parentRoleId: string) => {
    if (!editRow) return;
    if (String(parentRoleId) === String(editRow.parentRoleId ?? '')) {
      closeModal();
      return;
    }
    updateMutation.mutate({ id: editRow.id, payload: { parentRoleId } });
  };

  const saveWeeklyOff = () => {
    if (!editRow) return;
    updateMutation.mutate({
      id: editRow.id,
      payload: { weeklyOffDays: sortWeekdays(weeklyOffDraft) },
    });
  };

  const toggleWeeklyOff = (day: string) => {
    setWeeklyOffDraft((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      if (prev.length >= MAX_WEEKLY_OFF) return prev;
      return sortWeekdays([...prev, day]);
    });
  };

  const roster = data?.roster ?? [];
  const roleSchedules = data?.roleSchedules ?? [];
  const outletDefaults = data?.outletDefaults;

  useEffect(() => {
    if (!outletDefaults) return;
    setBulkPunch(outletDefaults.punchInTime);
    setBulkHours(String(outletDefaults.minHoursPerDay));
  }, [outletDefaults]);

  useEffect(() => {
    if (!roleSchedules.length || !outletDefaults) return;
    setRoleDrafts((prev) => {
      const next = { ...prev };
      for (const role of roleSchedules) {
        if (next[role.parentRoleId]) continue;
        next[role.parentRoleId] = {
          punchInTime: role.punchInTime || outletDefaults.punchInTime,
          minHoursPerDay: String(role.minHoursPerDay ?? outletDefaults.minHoursPerDay),
        };
      }
      return next;
    });
  }, [roleSchedules, outletDefaults]);

  const saveRoleSchedule = (parentRoleId: string) => {
    if (!selectedOutletId) return;
    setRoleSuccess(null);
    const draft = roleDrafts[parentRoleId];
    if (!draft) return;
    const hours = draft.minHoursPerDay.trim() ? parseInt(draft.minHoursPerDay, 10) : NaN;
    if (!draft.minHoursPerDay.trim() || isNaN(hours) || hours < 1 || hours > 24) {
      setRoleError('Duty hours must be between 1 and 24');
      return;
    }
    const normalizedPunch = normalizePunchTime(draft.punchInTime);
    if (!normalizedPunch) {
      setRoleError('Enter a valid clock-in time (e.g. 06:00)');
      return;
    }
    setRoleError(null);
    setSavingRoleId(parentRoleId);
    roleScheduleMutation.mutate({
      outletId: selectedOutletId,
      parentRoleId,
      punchInTime: normalizedPunch,
      minHoursPerDay: hours,
    });
  };

  const requestBulkApply = (mode: BulkApplyMode) => {
    setBulkSuccess(null);
    const hours = bulkHours.trim() ? parseInt(bulkHours, 10) : NaN;
    if (!bulkHours.trim() || isNaN(hours) || hours < 1 || hours > 24) {
      setBulkError('Hours must be between 1 and 24');
      return;
    }
    const normalizedPunch = normalizePunchTime(bulkPunch);
    if (!normalizedPunch) {
      setBulkError('Enter a valid coming time (e.g. 07:15)');
      return;
    }
    setBulkError(null);
    setBulkConfirmMode(mode);
  };

  const confirmBulkApply = () => {
    if (!selectedOutletId || !bulkConfirmMode) return;
    const hours = parseInt(bulkHours, 10);
    const normalizedPunch = normalizePunchTime(bulkPunch);
    if (!normalizedPunch || isNaN(hours)) return;
    bulkMutation.mutate({
      outletId: selectedOutletId,
      punchInTime: normalizedPunch,
      minHoursPerDay: hours,
      applyMode: bulkConfirmMode,
    });
  };

  const bulkConfirmCopy =
    bulkConfirmMode === 'set_all_staff'
      ? {
          title: 'Apply to whole team?',
          body: `Set coming time ${formatRosterTime(normalizePunchTime(bulkPunch))} and ${bulkHours}h/day for every staff member in this outlet.`,
        }
      : {
          title: 'Update outlet default?',
          body: `Save ${formatRosterTime(normalizePunchTime(bulkPunch))} and ${bulkHours}h as the outlet default. Staff without custom hours will use this (same as Payroll settings).`,
        };

  if (!selectedOutletId) {
    return <div className="p-6 text-amber-600">Select an outlet in the header first.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="h-7 w-7 text-emerald-600" />
            Duty Roster
          </h1>
          <p className="text-gray-500 mt-1">
            Staff shift times, hours, roles, and weekly off
            {outletDefaults ? (
              <span className="text-gray-400">
                {' '}
                · Outlet default: {formatRosterTime(outletDefaults.punchInTime)} ·{' '}
                {outletDefaults.minHoursPerDay}h
              </span>
            ) : null}
          </p>
        </div>
        <ListSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search staff…"
          className="sm:min-w-[16rem] sm:max-w-xs"
          id="duty-roster-search"
          aria-label="Search duty roster"
        />
      </div>

      <div className="mb-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-4 py-3 text-sm text-emerald-800">
        <p className="font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Tap any white box in the table to change that value.
        </p>
        <p className="text-xs text-emerald-700/90 mt-1">
          Set role clock-in times above first. Staff inherit their role until you set a custom time on that person.
        </p>
      </div>

      {roleSchedules.length > 0 ? (
        <div className="mb-4 rounded-2xl border border-teal-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setRolePanelOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-teal-50/40 transition-colors"
          >
            <div>
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-teal-600" />
                Role clock-in times
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                Set coming time and duty hours per role. Everyone in that role uses it unless overridden below.
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                rolePanelOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {rolePanelOpen ? (
            <div className="border-t border-teal-100 px-4 py-4 space-y-3 bg-teal-50/20">
              {roleSchedules.map((role) => {
                const draft = roleDrafts[role.parentRoleId] ?? {
                  punchInTime: role.punchInTime || outletDefaults?.punchInTime || '09:00',
                  minHoursPerDay: String(
                    role.minHoursPerDay ?? outletDefaults?.minHoursPerDay ?? 8
                  ),
                };
                const expanded = expandedRoleId === role.parentRoleId;
                const summaryTime = formatRosterTime(
                  role.punchInTime || outletDefaults?.punchInTime
                );
                const summaryHours = role.minHoursPerDay ?? outletDefaults?.minHoursPerDay ?? 8;
                const saving = savingRoleId === role.parentRoleId && roleScheduleMutation.isPending;
                return (
                  <div
                    key={role.parentRoleId}
                    className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRoleId((id) =>
                          id === role.parentRoleId ? null : role.parentRoleId
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{role.parentRoleName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          In {summaryTime} · {summaryHours}h duty
                          {role.inheritsOutletPunch ? ' · using outlet default' : ''}
                          {role.punchInMixed || role.hoursMixed ? ' · mixed slots' : ''}
                          {' · '}
                          {role.staffCount} staff
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                          expanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {expanded ? (
                      <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50/50">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                              Clock-in time
                            </label>
                            <SmartTimeInput
                              value={draft.punchInTime}
                              onChange={(v) =>
                                setRoleDrafts((prev) => ({
                                  ...prev,
                                  [role.parentRoleId]: { ...draft, punchInTime: v },
                                }))
                              }
                              placeholder={outletDefaults?.punchInTime || '09:00'}
                              ariaLabel={`${role.parentRoleName} clock-in time`}
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                              Duty hours / day
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={24}
                              value={draft.minHoursPerDay}
                              onChange={(e) =>
                                setRoleDrafts((prev) => ({
                                  ...prev,
                                  [role.parentRoleId]: {
                                    ...draft,
                                    minHoursPerDay: e.target.value.replace(/[^\d]/g, ''),
                                  },
                                }))
                              }
                              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-lg font-semibold tabular-nums bg-white"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => saveRoleSchedule(role.parentRoleId)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50"
                        >
                          {saving ? 'Saving…' : `Save for all ${role.parentRoleName}`}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <p className="text-xs text-gray-500 leading-relaxed px-1">
                Saving a role updates every outlet slot under that master role. Staff with a custom
                coming time keep their override until you clear it on their row.
              </p>
              {roleError ? <p className="text-sm text-red-600 px-1">{roleError}</p> : null}
              {roleSuccess ? (
                <p className="text-sm text-teal-800 font-medium rounded-lg bg-teal-50 border border-teal-100 px-3 py-2">
                  {roleSuccess}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {outletDefaults ? (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setBulkPanelOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50/80 transition-colors"
          >
            <div>
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                Team shift defaults
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                Synced with Payroll expected hours ·{' '}
                {formatRosterTime(outletDefaults.punchInTime)} · {outletDefaults.minHoursPerDay}h
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                bulkPanelOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {bulkPanelOpen ? (
            <div className="border-t border-gray-100 px-5 py-5 space-y-4 bg-gray-50/40">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Coming time
                  </label>
                  <SmartTimeInput
                    value={bulkPunch}
                    onChange={setBulkPunch}
                    placeholder={outletDefaults.punchInTime}
                    ariaLabel="Team coming time"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Total working time (hours/day)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={bulkHours}
                    onChange={(e) => setBulkHours(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder={String(outletDefaults.minHoursPerDay)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-lg font-semibold tabular-nums bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={bulkMutation.isPending}
                  onClick={() => requestBulkApply('set_all_staff')}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {bulkMutation.isPending && bulkConfirmMode === 'set_all_staff'
                    ? 'Applying…'
                    : 'Apply to whole team'}
                </button>
                <button
                  type="button"
                  disabled={bulkMutation.isPending}
                  onClick={() => requestBulkApply('outlet_default_only')}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 font-semibold hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"
                >
                  Save outlet default only
                </button>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Apply to whole team sets the same coming time and hours on every staff member.
                Outlet default only updates Payroll/outlet settings and clears per-staff overrides.
              </p>

              {bulkError ? <p className="text-sm text-red-600">{bulkError}</p> : null}
              {bulkSuccess ? (
                <p className="text-sm text-emerald-700 font-medium rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                  {bulkSuccess}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3 min-w-[10rem]">Coming time</th>
                  <th className="px-4 py-3 min-w-[9rem]">Min hours</th>
                  <th className="px-4 py-3">Master role</th>
                  <th className="px-4 py-3">Weekly off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roster.map((row) => {
                  const punchDisplay = formatRosterTime(
                    row.punchInTime ?? row.effectivePunchInTime
                  );
                  const hoursDisplay = row.minHoursPerDay ?? row.effectiveMinHoursPerDay;
                  const saving = updateMutation.isPending && editRow?.id === row.id;
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/40 align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900">{row.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{row.shiftType} shift</p>
                      </td>
                      <td className="px-4 py-4">
                        <EditableCell
                          label="Coming time"
                          value={punchDisplay}
                          hint={sourceLabel(row.punchInSource)}
                          onClick={() => openTimeModal(row)}
                          disabled={saving}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <EditableCell
                          label="Min hours"
                          value={`${hoursDisplay}h`}
                          hint={sourceLabel(row.hoursSource)}
                          onClick={() => openHoursModal(row)}
                          disabled={saving}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <EditableCell
                          label="Master role"
                          value={row.roleName || 'Not set'}
                          hint="Tap to change role type"
                          onClick={() => openRoleModal(row)}
                          disabled={saving}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <EditableCell
                          label="Weekly off"
                          value={formatWeeklyOff(row.weeklyOffDays ?? [])}
                          hint="Up to 3 days"
                          onClick={() => openWeeklyOffModal(row)}
                          disabled={saving}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {roster.length === 0 && (
            <p className="text-center text-gray-500 py-12">No staff found for this outlet.</p>
          )}
          {isFetching && !isLoading && (
            <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">Refreshing…</div>
          )}
        </div>
      )}

      {bulkConfirmMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{bulkConfirmCopy.title}</h2>
              <button
                type="button"
                onClick={() => setBulkConfirmMode(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">{bulkConfirmCopy.body}</p>
              {bulkError ? <p className="text-sm text-red-600">{bulkError}</p> : null}
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={bulkMutation.isPending}
                  onClick={() => setBulkConfirmMode(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={bulkMutation.isPending}
                  onClick={confirmBulkApply}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {bulkMutation.isPending ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editModal && editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {editModal === 'time' && 'Coming time'}
                  {editModal === 'hours' && 'Min hours / day'}
                  {editModal === 'role' && 'Master role'}
                  {editModal === 'weeklyOff' && 'Weekly off'}
                </h2>
                <p className="text-sm text-gray-500">{editRow.name}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {editModal === 'time' && (
                <>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={timeUsesDefault}
                      onChange={(e) => setTimeUsesDefault(e.target.checked)}
                    />
                    Use outlet/role default ({formatRosterTime(editRow.effectivePunchInTime)})
                  </label>
                  {!timeUsesDefault && (
                    <SmartTimeInput
                      value={timeDraft}
                      onChange={setTimeDraft}
                      placeholder="07:15"
                      ariaLabel="Coming time"
                    />
                  )}
                  <button
                    type="button"
                    disabled={updateMutation.isPending}
                    onClick={saveTime}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                </>
              )}

              {editModal === 'hours' && (
                <>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={hoursUsesDefault}
                      onChange={(e) => setHoursUsesDefault(e.target.checked)}
                    />
                    Use outlet/role default ({editRow.effectiveMinHoursPerDay}h)
                  </label>
                  {!hoursUsesDefault && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Hours per day
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={hoursDraft}
                        onChange={(e) => setHoursDraft(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-lg font-semibold tabular-nums"
                        placeholder="8"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={updateMutation.isPending}
                    onClick={saveHours}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                </>
              )}

              {editModal === 'role' && (
                <>
                  <p className="text-xs text-gray-500 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                    Choose a master role (e.g. Chef, Waiter). The system assigns the right slot
                    automatically.
                  </p>
                  {parentRolesLoading ? (
                    <LoadingSpinner className="py-8" />
                  ) : (
                    <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl">
                      {parentRoles.map((role: { _id: string; name: string }) => {
                        const selected =
                          String(role._id) === String(editRow.parentRoleId ?? '');
                        return (
                          <li key={role._id}>
                            <button
                              type="button"
                              disabled={updateMutation.isPending}
                              onClick={() => saveRole(role._id)}
                              className={`w-full text-left px-4 py-3 text-sm hover:bg-emerald-50 ${
                                selected ? 'bg-emerald-50 font-semibold text-emerald-800' : ''
                              }`}
                            >
                              {role.name}
                              {selected ? (
                                <span className="ml-2 text-xs text-emerald-600">(current)</span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                      {parentRoles.length === 0 && (
                        <li className="px-4 py-6 text-center text-gray-400 text-sm">
                          No master roles found
                        </li>
                      )}
                    </ul>
                  )}
                </>
              )}

              {editModal === 'weeklyOff' && (
                <>
                  <p className="text-xs text-gray-500">Select up to {MAX_WEEKLY_OFF} days.</p>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const on = weeklyOffDraft.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWeeklyOff(day)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            on
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    disabled={updateMutation.isPending}
                    onClick={saveWeeklyOff}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                </>
              )}

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
