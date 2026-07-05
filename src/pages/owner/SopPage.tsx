import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { taskApi } from '@/api/task';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SearchableSelect } from '@/components/SearchableSelect';
import { MultiSearchableSelect } from '@/components/MultiSearchableSelect';
import { CalendarDateField } from '@/components/CalendarDateField';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  Users,
  CheckCircle2,
  Archive,
  RotateCcw,
  AlertTriangle,
  Calendar,
  Sun,
  Moon,
  Copy,
  CheckSquare,
  Square,
  ArrowRightLeft,
} from 'lucide-react';
import { DuplicateToOutletModal, type DuplicateToOutletTarget } from '@/components/DuplicateToOutletModal';

type OccurrenceType = 'daily' | 'every-n-days' | 'specific-days' | 'specific-date-of-month' | 'onetime';

type SopGroup = {
  _id: string;
  name: string;
  parentRoleId?: { _id?: string; name?: string };
  collaboratorRoleIds?: Array<{ _id?: string; name?: string } | string>;
  taskIds?: { _id: string; title?: string }[];
  assignToType?: 'role' | 'staff';
  assignedEmployeeIds?: { _id: string; name?: string }[];
  isCollaborative?: boolean;
  occurrenceType?: OccurrenceType;
  intervalDays?: number;
  specificDays?: number[];
  specificDatesOfMonth?: number[];
  specificDate?: string;
  shiftType?: 'Day' | 'Night' | 'Both';
  sopVersion?: number;
  deletedAt?: string;
};

const OCCURRENCE_OPTIONS: { value: OccurrenceType; label: string; hint: string }[] = [
  { value: 'daily', label: 'Daily', hint: 'Runs every day' },
  { value: 'every-n-days', label: 'Every N days', hint: 'e.g. every 10 days' },
  { value: 'specific-days', label: 'Weekdays', hint: 'Sun–Sat pick' },
  { value: 'specific-date-of-month', label: 'Month dates', hint: 'e.g. 1st & 15th' },
  { value: 'onetime', label: 'One time', hint: 'Single calendar date' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toYmd(value?: string | Date | null): string {
  if (!value) return '';
  const s = typeof value === 'string' ? value.split('T')[0] : new Date(value).toISOString().split('T')[0];
  return s || '';
}

function scheduleSummary(g: SopGroup): string {
  switch (g.occurrenceType) {
    case 'every-n-days':
      return `Every ${g.intervalDays ?? '?'} days`;
    case 'specific-days':
      return (g.specificDays ?? []).map((d) => DAY_NAMES[d]).join(', ') || 'Weekdays';
    case 'specific-date-of-month':
      return (g.specificDatesOfMonth ?? []).map((d) => `${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}`).join(', ') || 'Month dates';
    case 'onetime':
      return g.specificDate ? `Once · ${toYmd(g.specificDate)}` : 'One time';
    default:
      return 'Daily';
  }
}

function roleNamesFromGroup(g: SopGroup): string[] {
  const fromCollab = (g.collaboratorRoleIds ?? [])
    .map((r) => (typeof r === 'object' && r?.name ? r.name : null))
    .filter((n): n is string => Boolean(n));
  if (fromCollab.length > 0) return fromCollab;
  if (g.parentRoleId?.name) return [g.parentRoleId.name];
  return [];
}

function assignSummary(g: SopGroup): string {
  if (g.isCollaborative) {
    if (g.assignToType === 'staff' && g.assignedEmployeeIds?.length) {
      const names = g.assignedEmployeeIds
        .map((e) => (typeof e === 'object' && e?.name ? e.name : null))
        .filter((n): n is string => Boolean(n));
      return names.length ? `Shared · ${names.join(', ')}` : 'Shared · staff';
    }
    const roles = roleNamesFromGroup(g);
    if (roles.length > 1) return `Shared · ${roles.join(', ')}`;
    if (roles.length === 1) return `Shared · ${roles[0]}`;
    return 'Shared';
  }
  if (g.assignToType === 'staff' && g.assignedEmployeeIds?.length) {
    const names = g.assignedEmployeeIds
      .map((e) => (typeof e === 'object' && e?.name ? e.name : null))
      .filter((n): n is string => Boolean(n));
    return names.length ? names.join(', ') : 'Staff';
  }
  return roleNamesFromGroup(g)[0] ?? '—';
}

export function SopPage() {
  const { selectedOutletId, outlets } = useOutletStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'active' | 'deleted'>('active');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<SopGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SopGroup | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<DuplicateToOutletTarget | null>(null);
  const [batchTransferTargets, setBatchTransferTargets] = useState<DuplicateToOutletTarget[] | null>(
    null
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => new Set());
  const [batchConfirmDelete, setBatchConfirmDelete] = useState(false);

  const [name, setName] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [assignToType, setAssignToType] = useState<'role' | 'staff'>('role');
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [occurrenceType, setOccurrenceType] = useState<OccurrenceType>('daily');
  const [intervalDays, setIntervalDays] = useState('10');
  const [specificDays, setSpecificDays] = useState<number[]>([]);
  const [specificDatesOfMonth, setSpecificDatesOfMonth] = useState<number[]>([]);
  const [specificDate, setSpecificDate] = useState('');
  const [shiftType, setShiftType] = useState<'Day' | 'Night' | 'Both'>('Both');
  const [isSharedSop, setIsSharedSop] = useState(false);

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['sop-groups', selectedOutletId, tab],
    queryFn: () => taskApi.getTemplateGroups(selectedOutletId!, { deleted: tab === 'deleted' }),
    enabled: !!selectedOutletId,
  });

  const { data: templatesData } = useQuery({
    queryKey: ['task-templates', selectedOutletId, 'sop-pick'],
    queryFn: () => taskApi.getTemplates(selectedOutletId!, { limit: 200 }),
    enabled: !!selectedOutletId,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['parent-roles'],
    queryFn: () => employeeApi.getParentRoles(),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['my-employees', selectedOutletId, 'sop'],
    queryFn: () => employeeApi.getMyEmployees({ outletId: selectedOutletId!, limit: 200 }),
    enabled: !!selectedOutletId,
  });

  const { data: ackData } = useQuery({
    queryKey: ['sop-ack', selectedOutletId],
    queryFn: () => taskApi.getSopAcknowledgments(selectedOutletId!),
    enabled: !!selectedOutletId && tab === 'active',
  });

  const groups: SopGroup[] = groupsData?.data?.groups ?? [];
  const templates = templatesData?.data?.templates ?? [];
  const parentRoles = rolesData?.data?.parentRoles ?? [];
  const employees = (employeesData as { data?: { employees?: { _id: string; name: string }[] } })?.data?.employees ?? [];
  const acknowledgments = ackData?.data?.acknowledgments ?? [];

  const templateOptions = useMemo(
    () => templates.map((t: { _id: string; title: string }) => ({ value: t._id, label: t.title })),
    [templates]
  );
  const roleOptions = useMemo(
    () => parentRoles.map((r: { _id: string; name: string }) => ({ value: String(r._id), label: r.name })),
    [parentRoles]
  );
  const staffOptions = useMemo(
    () => employees.map((e) => ({ value: e._id, label: e.name })),
    [employees]
  );

  const resetForm = () => {
    setName('');
    setRoleIds([]);
    setTaskIds([]);
    setAssignToType('role');
    setStaffIds([]);
    setOccurrenceType('daily');
    setIntervalDays('10');
    setSpecificDays([]);
    setSpecificDatesOfMonth([]);
    setSpecificDate('');
    setShiftType('Both');
    setIsSharedSop(false);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setModal('create');
  };

  const openEditGroup = (g: SopGroup) => {
    setEditing(g);
    setName(g.name);
    const prId = (g.parentRoleId as { _id?: string })?._id ?? '';
    const collabRoleIds =
      g.isCollaborative && g.assignToType !== 'staff' && g.collaboratorRoleIds?.length
        ? g.collaboratorRoleIds
            .map((r) => (typeof r === 'object' && r?._id ? String(r._id) : typeof r === 'string' ? r : ''))
            .filter(Boolean)
        : [];
    setRoleIds(collabRoleIds.length > 0 ? collabRoleIds : prId ? [prId] : []);
    setTaskIds((g.taskIds ?? []).map((t) => (typeof t === 'string' ? t : t._id)));
    setAssignToType(g.assignToType ?? 'role');
    setStaffIds((g.assignedEmployeeIds ?? []).map((e) => (typeof e === 'string' ? e : e._id)));
    setOccurrenceType((g.occurrenceType as OccurrenceType) ?? 'daily');
    setIntervalDays(String(g.intervalDays ?? 10));
    setSpecificDays(g.specificDays ?? []);
    setSpecificDatesOfMonth(g.specificDatesOfMonth ?? []);
    setSpecificDate(toYmd(g.specificDate));
    setShiftType(g.shiftType ?? 'Both');
    setIsSharedSop(Boolean(g.isCollaborative));
    setModal('edit');
  };

  const buildPayload = () => {
    const parentRoleId = assignToType === 'role' ? (roleIds[0] ?? '') : undefined;
    const payload: Record<string, unknown> = {
      name: name.trim(),
      outletId: selectedOutletId!,
      ...(parentRoleId ? { parentRoleId } : {}),
      taskIds,
      assignToType,
      assignedEmployeeIds: assignToType === 'staff' ? staffIds : [],
      isCollaborative: isSharedSop,
      collaboratorRoleIds: assignToType === 'role' ? roleIds : [],
      shiftType,
      occurrenceType,
      intervalDays: occurrenceType === 'every-n-days' ? Math.max(1, parseInt(intervalDays, 10) || 10) : undefined,
      specificDays: occurrenceType === 'specific-days' && specificDays.length ? specificDays : undefined,
      specificDatesOfMonth:
        occurrenceType === 'specific-date-of-month' && specificDatesOfMonth.length ? specificDatesOfMonth : undefined,
      specificDate: occurrenceType === 'onetime' && specificDate ? specificDate : undefined,
    };
    return payload;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (modal === 'edit' && editing) {
        return taskApi.updateTemplateGroup(editing._id, buildPayload());
      }
      if (isSharedSop || assignToType === 'staff') {
        return taskApi.createTemplateGroup(buildPayload());
      }
      const targets = roleIds.length > 1 ? roleIds : [roleIds[0]];
      let last;
      for (let i = 0; i < targets.length; i++) {
        const rid = targets[i];
        const roleLabel = roleOptions.find((o) => o.value === rid)?.label;
        const payload = {
          ...buildPayload(),
          parentRoleId: rid,
          collaboratorRoleIds: [rid],
          isCollaborative: false,
          name: targets.length > 1 ? `${name.trim()} (${roleLabel})` : name.trim(),
        };
        last = await taskApi.createTemplateGroup(payload);
      }
      return last;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sop-groups', selectedOutletId] });
      setModal(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taskApi.deleteTemplateGroup(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sop-groups', selectedOutletId] });
      setDeleteTarget(null);
      setTab('deleted');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => taskApi.restoreTemplateGroup(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sop-groups', selectedOutletId] });
      setTab('active');
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await taskApi.deleteTemplateGroup(id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sop-groups', selectedOutletId] });
      setSelectedGroupIds(new Set());
      setSelectionMode(false);
      setBatchConfirmDelete(false);
      setTab('deleted');
    },
  });

  const clearGroupSelection = () => setSelectedGroupIds(new Set());

  const exitSelectionMode = () => {
    setSelectionMode(false);
    clearGroupSelection();
  };

  const toggleGroupSelection = (id: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllGroups = () => {
    setSelectedGroupIds(new Set(groups.map((g) => g._id)));
  };

  const openBatchTransfer = () => {
    const targets = groups
      .filter((g) => selectedGroupIds.has(g._id))
      .map((g) => ({
        kind: 'sop' as const,
        id: g._id,
        title: g.name,
        sourceOutletId: selectedOutletId!,
      }));
    setBatchTransferTargets(targets);
  };

  const selectedCount = selectedGroupIds.size;

  useEffect(() => {
    exitSelectionMode();
    setBatchTransferTargets(null);
    setDuplicateTarget(null);
  }, [selectedOutletId]);

  useEffect(() => {
    if (tab === 'deleted') exitSelectionMode();
  }, [tab]);

  const toggleDay = (d: number) => {
    setSpecificDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  };

  const toggleMonthDate = (d: number) => {
    setSpecificDatesOfMonth((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  };

  const selectAllRoles = () => setRoleIds(roleOptions.map((o) => o.value));

  const canSave =
    name.trim() &&
    taskIds.length > 0 &&
    (assignToType === 'role' ? roleIds.length > 0 : staffIds.length > 0) &&
    (!isSharedSop ||
      (assignToType === 'role' ? roleIds.length >= 2 : staffIds.length >= 2)) &&
    (occurrenceType !== 'onetime' || specificDate) &&
    (occurrenceType !== 'every-n-days' || (parseInt(intervalDays, 10) >= 1 && parseInt(intervalDays, 10) <= 90));

  if (!selectedOutletId) {
    return <div className="p-6 text-amber-600">Select an outlet first.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-emerald-600" /> SOPs
          </h1>
          <p className="text-gray-500 mt-1">Bundled tasks, schedules, and acknowledgment tracking</p>
        </div>
        {tab === 'active' && (
          <div className="flex flex-wrap items-center gap-2 w-fit">
            {selectionMode ? (
              <>
                <button
                  type="button"
                  onClick={selectAllGroups}
                  disabled={groups.length === 0}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={exitSelectionMode}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setSelectionMode(true)}
                className="px-4 py-2.5 rounded-xl border border-emerald-200 font-medium text-emerald-700 hover:bg-emerald-50"
              >
                Select
              </button>
            )}
            <button
              type="button"
              onClick={openCreate}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Create SOP
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600'}`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setTab('deleted')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'deleted' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600'}`}
        >
          <Archive className="h-4 w-4" /> Deleted
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-gray-500 rounded-2xl border border-dashed border-gray-200">
          {tab === 'active' ? 'No SOPs yet. Create one to bundle tasks for your team.' : 'No deleted SOPs.'}
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map((g) => {
            const ackCount =
              tab === 'active'
                ? acknowledgments.filter(
                    (a: { templateGroupId?: { _id?: string } | string }) =>
                      String((a.templateGroupId as { _id?: string })?._id ?? a.templateGroupId) === g._id
                  ).length
                : 0;
            const isSelected = selectedGroupIds.has(g._id);
            return (
              <div
                key={g._id}
                role={selectionMode && tab === 'active' ? 'button' : undefined}
                tabIndex={selectionMode && tab === 'active' ? 0 : undefined}
                onClick={
                  selectionMode && tab === 'active' ? () => toggleGroupSelection(g._id) : undefined
                }
                onKeyDown={
                  selectionMode && tab === 'active'
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleGroupSelection(g._id);
                        }
                      }
                    : undefined
                }
                className={`rounded-2xl border bg-white p-5 card-hover transition-colors ${
                  tab === 'deleted' ? 'border-gray-200 opacity-90' : 'border-gray-200'
                } ${
                  selectionMode && tab === 'active'
                    ? isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-200 cursor-pointer'
                      : 'cursor-pointer hover:border-emerald-300'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {selectionMode && tab === 'active' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroupSelection(g._id);
                        }}
                        className="mt-0.5 shrink-0 text-emerald-600 hover:bg-emerald-50 rounded-lg p-1"
                        aria-label={isSelected ? 'Deselect SOP' : 'Select SOP'}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-6 w-6" />
                        ) : (
                          <Square className="h-6 w-6 text-gray-300" />
                        )}
                      </button>
                    ) : null}
                    <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900">{g.name}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {assignSummary(g)} · {g.taskIds?.length ?? 0} tasks · {scheduleSummary(g)} ·{' '}
                      {g.shiftType ?? 'Both'} shift
                    </p>
                    {tab === 'active' && (
                      <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {ackCount} acknowledgment(s)
                      </p>
                    )}
                    {tab === 'deleted' && g.deletedAt && (
                      <p className="text-xs text-gray-400 mt-1">Deleted {new Date(g.deletedAt).toLocaleDateString()}</p>
                    )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {tab === 'active' && !selectionMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setDuplicateTarget({
                              kind: 'sop',
                              id: g._id,
                              title: g.name,
                              sourceOutletId: selectedOutletId!,
                            })
                          }
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                          title="Duplicate to outlet"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => openEditGroup(g)} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-700">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(g)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => restoreMutation.mutate(g._id)}
                        disabled={restoreMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100"
                      >
                        <RotateCcw className="h-4 w-4" /> Restore
                      </button>
                    )}
                  </div>
                </div>
                <ul className="mt-3 text-sm text-gray-600 list-disc list-inside">
                  {(g.taskIds ?? []).map((t) => (
                    <li key={typeof t === 'string' ? t : t._id}>{typeof t === 'object' ? t.title : t}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto relative border border-emerald-100">
            <button type="button" onClick={() => setModal(null)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:bg-gray-100 z-10">
              <X className="h-5 w-5" />
            </button>
            <div className="p-6 border-b border-emerald-50 bg-gradient-to-r from-emerald-50/80 to-white">
              <h2 className="text-xl font-semibold text-gray-900">{modal === 'create' ? 'Create SOP' : 'Edit SOP'}</h2>
              <p className="text-sm text-gray-500 mt-0.5">Match mobile app schedule & assignment rules</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">SOP name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="e.g. Opening checklist"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tasks in this SOP</label>
                <MultiSearchableSelect values={taskIds} onChange={setTaskIds} options={templateOptions} placeholder="Search & select tasks…" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Shift</label>
                <div className="flex gap-2">
                  {(['Day', 'Night', 'Both'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShiftType(s)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        shiftType === s
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      {s === 'Day' ? <Sun className="h-3.5 w-3.5" /> : s === 'Night' ? <Moon className="h-3.5 w-3.5" /> : null}
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule</label>
                <SearchableSelect
                  value={occurrenceType}
                  onChange={(v) => setOccurrenceType(v as OccurrenceType)}
                  options={OCCURRENCE_OPTIONS.map((o) => ({ value: o.value, label: o.label, subtitle: o.hint }))}
                  placeholder="Choose schedule…"
                  showSearch={false}
                />
                {occurrenceType === 'every-n-days' && (
                  <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 animate-slide-up">
                    <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-sm text-gray-600">Every</span>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={intervalDays}
                      onChange={(e) => setIntervalDays(e.target.value)}
                      className="w-16 px-2 py-1.5 rounded-lg border border-emerald-200 text-center text-sm font-semibold"
                    />
                    <span className="text-sm text-gray-600">days</span>
                  </div>
                )}
                {occurrenceType === 'specific-days' && (
                  <div className="mt-3 flex flex-wrap gap-2 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 animate-slide-up">
                    {DAY_NAMES.map((label, d) => {
                      const on = specificDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDay(d)}
                          className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${
                            on ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'
                          }`}
                          title={label}
                        >
                          {label.slice(0, 2)}
                        </button>
                      );
                    })}
                  </div>
                )}
                {occurrenceType === 'specific-date-of-month' && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 animate-slide-up max-h-40 overflow-y-auto">
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                        const on = specificDatesOfMonth.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleMonthDate(d)}
                            className={`w-9 h-9 rounded-lg text-xs font-semibold ${
                              on ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {occurrenceType === 'onetime' && (
                  <div className="mt-3 animate-slide-up">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Run on date</label>
                    <CalendarDateField value={specificDate} onChange={setSpecificDate} placeholder="Pick date" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  <Users className="h-4 w-4 text-emerald-600" /> Assign to
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setAssignToType('role')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      assignToType === 'role' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    Whole role
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignToType('staff')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      assignToType === 'staff' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    Specific staff
                  </button>
                </div>
                {assignToType === 'role' ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">All staff in the selected master role(s) receive this SOP. Pick one or more master roles.</p>
                    <MultiSearchableSelect
                      values={roleIds}
                      onChange={setRoleIds}
                      options={roleOptions}
                      placeholder="Select master role(s)…"
                    />
                    {roleOptions.length > 1 && (
                      <button type="button" onClick={selectAllRoles} className="text-xs font-medium text-emerald-700 hover:underline">
                        Select all roles
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">
                      Pick one or more staff — roles are taken from each person&apos;s active role.
                    </p>
                    <MultiSearchableSelect values={staffIds} onChange={setStaffIds} options={staffOptions} placeholder="Select staff…" />
                  </div>
                )}
              </div>

              {(assignToType === 'role' && roleIds.length > 0) ||
              (assignToType === 'staff' && staffIds.length > 1) ? (
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isSharedSop}
                    onChange={(e) => setIsSharedSop(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <span className="font-medium">Shared SOP</span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      One collaborative bundle — team members can complete different tasks in it. Anyone&apos;s
                      progress counts for everyone.
                    </span>
                    {assignToType === 'role' && roleIds.length > 1 && !isSharedSop ? (
                      <span className="mt-1 block text-xs text-amber-700">
                        Uncheck to create a separate SOP copy per role instead.
                      </span>
                    ) : null}
                  </span>
                </label>
              ) : null}

              {saveMutation.isError && <p className="text-red-600 text-sm">{getApiErrorMessage(saveMutation.error)}</p>}
              <button
                type="button"
                disabled={!canSave || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-emerald-700 transition-colors"
              >
                {saveMutation.isPending ? 'Saving…' : 'Save SOP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100">
            <div className="p-6 bg-gradient-to-br from-red-50 to-white">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete this SOP?</h3>
              <p className="text-sm text-gray-600 mt-2">
                <strong>{deleteTarget.name}</strong> will move to <em>Deleted</em>. You can restore it later. Staff will no longer receive new assignments from this bundle.
              </p>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget._id)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete SOP'}
              </button>
            </div>
            {deleteMutation.isError && (
              <p className="px-6 pb-4 text-red-600 text-sm">{getApiErrorMessage(deleteMutation.error)}</p>
            )}
          </div>
        </div>
      )}

      {batchConfirmDelete && selectedCount > 0 && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 animate-slide-up relative">
            <button
              type="button"
              onClick={() => setBatchConfirmDelete(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-gray-900 font-medium pr-8">
              Delete {selectedCount} SOP{selectedCount === 1 ? '' : 's'}?
            </p>
            <p className="text-sm text-gray-500 mt-1">They will move to Deleted. You can restore them later.</p>
            {batchDeleteMutation.isError && (
              <p className="mt-3 text-sm text-red-600">{getApiErrorMessage(batchDeleteMutation.error)}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => batchDeleteMutation.mutate([...selectedGroupIds])}
                disabled={batchDeleteMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {batchDeleteMutation.isPending ? 'Deleting…' : 'Delete all'}
              </button>
              <button
                onClick={() => setBatchConfirmDelete(false)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectionMode && tab === 'active' && selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-gray-800/10 bg-gray-900 px-4 py-3 text-white shadow-2xl sm:gap-3 sm:px-6">
          <span className="text-sm font-medium sm:pr-2">{selectedCount} selected</span>
          <button
            type="button"
            onClick={openBatchTransfer}
            disabled={outlets.length < 2}
            title={outlets.length < 2 ? 'Add another outlet to transfer SOPs' : undefined}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transfer
          </button>
          <button
            type="button"
            onClick={() => setBatchConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <button
            type="button"
            onClick={clearGroupSelection}
            className="rounded-xl px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/10"
          >
            Clear
          </button>
        </div>
      )}

      <DuplicateToOutletModal
        target={duplicateTarget}
        targets={batchTransferTargets}
        onClose={() => {
          setDuplicateTarget(null);
          setBatchTransferTargets(null);
        }}
        onSuccess={() => {
          exitSelectionMode();
          void queryClient.invalidateQueries({ queryKey: ['sop-groups'] });
        }}
      />
    </div>
  );
}
