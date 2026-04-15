import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { useAuth } from '@/hooks/useAuth';
import type { Owner } from '@/types/auth';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SearchableSelect } from '@/components/SearchableSelect';
import { GripVertical, X, Plus, Crown, ChevronRight } from 'lucide-react';

const DROP_OWNER_KEY = '__owner__';

type ReportsRef = { _id?: string; name?: string } | string | null | undefined;

type EmpRow = {
  _id: string;
  name: string;
  isActive?: boolean;
  activeRoleId?: { name?: string; parentRoleId?: { name?: string } } | string | null;
  reportsToEmployeeId?: ReportsRef;
  reportsToOwnerId?: ReportsRef;
};

type EmpNode = { emp: EmpRow; children: EmpNode[] };

function refId(ref: ReportsRef): string | null {
  if (!ref || typeof ref !== 'object') return null;
  const id = ref._id;
  return id ? String(id) : null;
}

/** One line: "MASTER · Outlet role" or fallbacks */
function roleCaption(emp: EmpRow): string {
  const ar = emp.activeRoleId;
  if (!ar || typeof ar === 'string') return 'No role assigned';
  const master = ar.parentRoleId?.name?.trim();
  const role = ar.name?.trim();
  if (master && role) return `${master} · ${role}`;
  return role || master || 'No role assigned';
}

function reportsToOwner(emp: EmpRow, ownerId: string): boolean {
  return refId(emp.reportsToOwnerId) === String(ownerId);
}

function reportsToEmployee(emp: EmpRow, employeeId: string): boolean {
  return refId(emp.reportsToEmployeeId) === String(employeeId);
}

/**
 * Tree under outlet owner: direct reports = report to owner, or no manager set, or broken manager ref.
 */
function buildPeopleTree(employees: EmpRow[], ownerId: string): EmpNode[] {
  const byId = new Map(employees.map((e) => [String(e._id), e]));
  const active = employees.filter((e) => e.isActive !== false);

  function isTopLevel(emp: EmpRow): boolean {
    if (reportsToOwner(emp, ownerId)) return true;
    const mgrEmp = refId(emp.reportsToEmployeeId);
    if (!mgrEmp && !refId(emp.reportsToOwnerId)) return true;
    if (mgrEmp) {
      const mgr = byId.get(mgrEmp);
      if (!mgr || mgr.isActive === false) return true;
    }
    return false;
  }

  function childrenOf(managerId: string): EmpRow[] {
    return active.filter((e) => reportsToEmployee(e, managerId));
  }

  function buildNode(emp: EmpRow): EmpNode {
    const kids = childrenOf(String(emp._id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(buildNode);
    return { emp, children: kids };
  }

  return active
    .filter(isTopLevel)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(buildNode);
}

function directReportsOf(employees: EmpRow[], managerEmpId: string): EmpRow[] {
  return employees.filter((e) => refId(e.reportsToEmployeeId) === String(managerEmpId));
}

/** True if `personId` is the same as or below `ancestorEmpId` in the employee-manager chain */
function isUnderEmployeeManager(employees: EmpRow[], personId: string, ancestorEmpId: string): boolean {
  let cur = String(personId);
  if (cur === String(ancestorEmpId)) return true;
  for (let i = 0; i < 64; i++) {
    const e = employees.find((x) => String(x._id) === cur);
    if (!e) return false;
    const p = refId(e.reportsToEmployeeId);
    if (!p) return false;
    if (p === String(ancestorEmpId)) return true;
    cur = p;
  }
  return false;
}

type MoveTarget = { kind: 'owner' } | { kind: 'employee'; id: string };

type ReportingMutationVars =
  | {
      kind: 'simple';
      employeeId: string;
      reportsToEmployeeId?: string | null;
      reportsToOwnerId?: string | null;
    }
  | {
      kind: 'move';
      draggedId: string;
      target: MoveTarget;
      mode: 'withTeam' | 'singleOnly';
      ownerId: string;
      ownerName: string;
      oldReportsToEmployeeId: string | null;
      oldReportsToOwnerId: string | null;
      directReportIds: string[];
    };

function patchEmployeeRefs(
  list: EmpRow[],
  employeeId: string,
  reportsToEmployeeId: string | null,
  reportsToOwnerId: string | null,
  ownerName: string
): EmpRow[] {
  const copy = JSON.parse(JSON.stringify(list)) as EmpRow[];
  const e = copy.find((x) => String(x._id) === String(employeeId));
  if (!e) return copy;
  e.reportsToEmployeeId = null;
  e.reportsToOwnerId = null;
  if (reportsToOwnerId) {
    e.reportsToOwnerId = { _id: reportsToOwnerId, name: ownerName };
  } else if (reportsToEmployeeId) {
    const mgr = copy.find((x) => String(x._id) === String(reportsToEmployeeId));
    e.reportsToEmployeeId = { _id: reportsToEmployeeId, name: mgr?.name ?? '' };
  }
  return copy;
}

function applyOptimisticReporting(list: EmpRow[], vars: ReportingMutationVars, ownerName: string): EmpRow[] {
  if (vars.kind === 'simple') {
    return patchEmployeeRefs(
      list,
      vars.employeeId,
      vars.reportsToEmployeeId ?? null,
      vars.reportsToOwnerId ?? null,
      ownerName
    );
  }
  let copy = JSON.parse(JSON.stringify(list)) as EmpRow[];
  const dragged = copy.find((x) => String(x._id) === vars.draggedId);
  if (!dragged) return copy;

  const newEmp =
    vars.target.kind === 'employee' ? vars.target.id : null;
  const newOwner = vars.target.kind === 'owner' ? vars.ownerId : null;
  copy = patchEmployeeRefs(copy, vars.draggedId, newEmp, newOwner, ownerName);

  if (vars.mode === 'singleOnly' && vars.directReportIds.length > 0) {
    const repEmp = vars.oldReportsToEmployeeId;
    const repOwner = vars.oldReportsToOwnerId;
    for (const rid of vars.directReportIds) {
      const r = copy.find((x) => String(x._id) === rid);
      if (!r) continue;
      r.reportsToEmployeeId = null;
      r.reportsToOwnerId = null;
      if (repEmp) {
        const mgr = copy.find((x) => String(x._id) === repEmp);
        r.reportsToEmployeeId = { _id: repEmp, name: mgr?.name ?? '' };
      } else if (repOwner) {
        r.reportsToOwnerId = { _id: repOwner, name: ownerName };
      }
    }
  }
  return copy;
}

type DirectReportPicker =
  | { kind: 'employee'; managerId: string; managerName: string }
  | { kind: 'owner'; ownerId: string; managerName: string };

/**
 * Must be defined outside HierarchyPage so React does not remount the subtree
 * on every parent re-render (which breaks HTML5 drag and leaves drag state stuck).
 */
const TREE_EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';

function EmpBranch({
  node,
  depth,
  draggedEmployeeId,
  dropTargetId,
  onEmployeeDragStart,
  onDragEnd,
  onDragOverTarget,
  onDragLeaveTarget,
  onDropOnEmployee,
  onOpenDirectReport,
}: {
  node: EmpNode;
  depth: number;
  draggedEmployeeId: string | null;
  dropTargetId: string | null;
  onEmployeeDragStart: (e: React.DragEvent, id: string, name: string) => void;
  onDragEnd: () => void;
  onDragOverTarget: (e: React.DragEvent, id: string) => void;
  onDragLeaveTarget: (e: React.DragEvent) => void;
  onDropOnEmployee: (e: React.DragEvent, employeeId: string) => void;
  onOpenDirectReport: (id: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const id = String(node.emp._id);
  const isDrop = dropTargetId === id;
  const isDragging = draggedEmployeeId === id;
  const hasChildren = node.children.length > 0;
  const childCount = node.children.length;

  return (
    <div className={depth > 0 ? 'ml-5 pl-4 border-l-2 border-emerald-100' : ''}>
      <div
        draggable
        onDragStart={(e) => onEmployeeDragStart(e, id, node.emp.name)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOverTarget(e, id)}
        onDragLeave={onDragLeaveTarget}
        onDrop={(e) => onDropOnEmployee(e, id)}
        className={`group flex items-start gap-2 sm:gap-3 py-3 pr-2 rounded-xl border mb-1 transition-shadow duration-200 ${
          isDrop ? 'ring-2 ring-emerald-400 ring-offset-1 border-emerald-300 bg-emerald-50/50' : 'border-transparent hover:bg-emerald-50/40'
        } ${isDragging ? 'ring-2 ring-emerald-500/40 bg-emerald-50/30' : ''}`}
      >
        <div className="shrink-0 pt-1 text-emerald-500/70 cursor-grab active:cursor-grabbing touch-none" title="Drag to change manager">
          <GripVertical className="h-4 w-4" />
        </div>
        {hasChildren ? (
          <button
            type="button"
            draggable={false}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center text-emerald-700/80 hover:bg-emerald-100/90 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 transition-colors duration-200"
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${childCount} direct reports` : `Expand ${childCount} direct reports`}
          >
            <ChevronRight
              className={`h-5 w-5 transition-transform duration-300 ease-out shrink-0 ${expanded ? 'rotate-90' : 'rotate-0'}`}
              style={{ transitionTimingFunction: TREE_EASE }}
              aria-hidden
            />
          </button>
        ) : (
          <div className="shrink-0 w-8 h-8" aria-hidden />
        )}
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {node.emp.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-semibold text-gray-900">{node.emp.name}</p>
          <p className="text-sm text-gray-600 mt-0.5">{roleCaption(node.emp)}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenDirectReport(id, node.emp.name)}
          className="shrink-0 p-2 rounded-lg text-emerald-600 hover:bg-emerald-100 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          title="Add someone who reports to this person"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      {hasChildren && (
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
          style={{ transitionTimingFunction: TREE_EASE }}
        >
          <div
            className="min-h-0 overflow-hidden motion-reduce:transition-none"
            aria-hidden={!expanded}
          >
            <div
              className={`pt-0.5 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                expanded ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {node.children.map((ch) => (
                <EmpBranch
                  key={String(ch.emp._id)}
                  node={ch}
                  depth={depth + 1}
                  draggedEmployeeId={draggedEmployeeId}
                  dropTargetId={dropTargetId}
                  onEmployeeDragStart={onEmployeeDragStart}
                  onDragEnd={onDragEnd}
                  onDragOverTarget={onDragOverTarget}
                  onDragLeaveTarget={onDragLeaveTarget}
                  onDropOnEmployee={onDropOnEmployee}
                  onOpenDirectReport={onOpenDirectReport}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type PendingMove = {
  draggedId: string;
  draggedName: string;
  target: MoveTarget;
  targetLabel: string;
  directReports: { _id: string; name: string }[];
  oldReportsToEmployeeId: string | null;
  oldReportsToOwnerId: string | null;
  previousManagerLabel: string;
};

function getEmployeesFromCache(queryClient: ReturnType<typeof useQueryClient>, outletId: string, fallback: EmpRow[]): EmpRow[] {
  const entries = queryClient.getQueriesData<{ data?: { employees?: EmpRow[] } }>({
    queryKey: ['my-employees', outletId],
    exact: false,
  });
  for (const [, data] of entries) {
    const em = data?.data?.employees;
    if (Array.isArray(em)) return em as EmpRow[];
  }
  return fallback;
}

export function HierarchyPage() {
  const { selectedOutletId } = useOutletStore();
  const { user, role: authRole } = useAuth();
  const [directReportPicker, setDirectReportPicker] = useState<DirectReportPicker | null>(null);
  const [selectedSubordinateId, setSelectedSubordinateId] = useState('');
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [hierarchyNotice, setHierarchyNotice] = useState<string | null>(null);
  const [draggedEmployeeId, setDraggedEmployeeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  /** Collapse all staff under the owner card */
  const [ownerBranchExpanded, setOwnerBranchExpanded] = useState(true);
  const queryClient = useQueryClient();

  const ownerInfo = useMemo(() => {
    if (authRole !== 'OWNER' || !user || !('id' in user)) return null;
    const o = user as Owner;
    if (!o.id) return null;
    return { id: String(o.id), name: o.name?.trim() || 'Owner' };
  }, [authRole, user]);

  const { data: empData, isLoading } = useQuery({
    queryKey: ['my-employees', selectedOutletId],
    queryFn: () =>
      employeeApi.getMyEmployees({
        outletId: selectedOutletId ?? undefined,
        limit: 100,
        includeInactive: true,
      }),
    enabled: !!selectedOutletId,
  });

  const employees = (empData?.data?.employees ?? []) as EmpRow[];

  const peopleTree = useMemo(() => {
    if (!ownerInfo) return [];
    return buildPeopleTree(employees, ownerInfo.id);
  }, [employees, ownerInfo]);

  const directReportStaffOptions = useMemo(() => {
    if (!directReportPicker) return [];
    return employees
      .filter((e) => {
        if (e.isActive === false) return false;
        if (directReportPicker.kind === 'employee' && String(e._id) === directReportPicker.managerId) return false;
        return true;
      })
      .map((e) => ({ value: String(e._id), label: e.name }));
  }, [employees, directReportPicker]);

  const clearDragUi = useCallback(() => {
    setDraggedEmployeeId(null);
    setDropTargetId(null);
  }, []);

  /** If drag ends anywhere (including cancelled / dropped outside), reset UI */
  useEffect(() => {
    window.addEventListener('dragend', clearDragUi);
    return () => window.removeEventListener('dragend', clearDragUi);
  }, [clearDragUi]);

  const reportingMutation = useMutation({
    mutationFn: async (vars: ReportingMutationVars) => {
      if (vars.kind === 'simple') {
        await employeeApi.update(vars.employeeId, {
          reportsToEmployeeId: vars.reportsToEmployeeId,
          reportsToOwnerId: vars.reportsToOwnerId,
        });
        return;
      }
      const headPayload =
        vars.target.kind === 'owner'
          ? { reportsToOwnerId: vars.ownerId, reportsToEmployeeId: null }
          : { reportsToEmployeeId: vars.target.id, reportsToOwnerId: null };
      await employeeApi.update(vars.draggedId, headPayload);
      if (vars.mode === 'singleOnly' && vars.directReportIds.length > 0) {
        const childPayload =
          vars.oldReportsToEmployeeId != null
            ? { reportsToEmployeeId: vars.oldReportsToEmployeeId, reportsToOwnerId: null }
            : { reportsToOwnerId: vars.ownerId, reportsToEmployeeId: null };
        await Promise.all(vars.directReportIds.map((id) => employeeApi.update(id, childPayload)));
      }
    },
    onMutate: async (vars) => {
      if (!ownerInfo || !selectedOutletId) return {};
      await queryClient.cancelQueries({ queryKey: ['my-employees', selectedOutletId], exact: false });
      const previous = queryClient.getQueriesData({ queryKey: ['my-employees', selectedOutletId], exact: false });
      queryClient.setQueriesData({ queryKey: ['my-employees', selectedOutletId], exact: false }, (old) => {
        if (!old || typeof old !== 'object') return old;
        const o = old as { success?: boolean; data?: { employees: EmpRow[] } };
        const emps = o.data?.employees;
        if (!emps) return old;
        return {
          ...o,
          data: {
            ...o.data!,
            employees: applyOptimisticReporting(emps, vars, ownerInfo.name),
          },
        };
      });
      setPendingMove(null);
      setDirectReportPicker(null);
      setSelectedSubordinateId('');
      clearDragUi();
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = ctx?.previous as [QueryKey, unknown][] | undefined;
      prev?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-employees'] });
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      clearDragUi();
    },
  });
  const mutateReporting = reportingMutation.mutate;

  const closeDirectReportPicker = () => {
    setDirectReportPicker(null);
    setSelectedSubordinateId('');
  };

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.stopPropagation();
    setDropTargetId(targetId);
  }, []);

  /** Only clear drop highlight when pointer actually leaves the row (not when entering a child) */
  const handleDragLeaveRow = useCallback((e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDropTargetId(null);
  }, []);

  const handleDropOnTarget = useCallback(
    (e: React.DragEvent, target: 'owner' | { employeeId: string }) => {
      e.preventDefault();
      e.stopPropagation();
      clearDragUi();
      const draggedId =
        e.dataTransfer.getData('employeeId') || e.dataTransfer.getData('text/plain');
      if (!draggedId || !ownerInfo || !selectedOutletId) return;

      const emps = getEmployeesFromCache(queryClient, selectedOutletId, employees);
      const dragged = emps.find((x) => String(x._id) === draggedId);
      if (!dragged) return;

      const oldEmp = refId(dragged.reportsToEmployeeId);
      const oldOwner = refId(dragged.reportsToOwnerId);
      const prevLabel = oldEmp
        ? emps.find((x) => String(x._id) === oldEmp)?.name ?? 'their current manager'
        : ownerInfo.name;

      if (target === 'owner') {
        if (draggedId === ownerInfo.id) return;
        const kids = directReportsOf(emps, draggedId);
        if (kids.length > 0) {
          setPendingMove({
            draggedId,
            draggedName: dragged.name,
            target: { kind: 'owner' },
            targetLabel: ownerInfo.name,
            directReports: kids.map((k) => ({ _id: String(k._id), name: k.name })),
            oldReportsToEmployeeId: oldEmp,
            oldReportsToOwnerId: oldOwner,
            previousManagerLabel: prevLabel,
          });
          return;
        }
        mutateReporting({
          kind: 'move',
          draggedId,
          target: { kind: 'owner' },
          mode: 'withTeam',
          ownerId: ownerInfo.id,
          ownerName: ownerInfo.name,
          oldReportsToEmployeeId: oldEmp,
          oldReportsToOwnerId: oldOwner,
          directReportIds: [],
        });
        return;
      }

      const targetId = target.employeeId;
      if (draggedId === targetId) return;
      if (isUnderEmployeeManager(emps, targetId, draggedId)) {
        setHierarchyNotice("Can't place someone under a person who reports to them.");
        window.setTimeout(() => setHierarchyNotice(null), 4500);
        return;
      }

      const targetEmp = emps.find((x) => String(x._id) === targetId);
      const kids = directReportsOf(emps, draggedId);
      if (kids.length > 0) {
        setPendingMove({
          draggedId,
          draggedName: dragged.name,
          target: { kind: 'employee', id: targetId },
          targetLabel: targetEmp?.name ?? 'Staff',
          directReports: kids.map((k) => ({ _id: String(k._id), name: k.name })),
          oldReportsToEmployeeId: oldEmp,
          oldReportsToOwnerId: oldOwner,
          previousManagerLabel: prevLabel,
        });
        return;
      }

      mutateReporting({
        kind: 'move',
        draggedId,
        target: { kind: 'employee', id: targetId },
        mode: 'withTeam',
        ownerId: ownerInfo.id,
        ownerName: ownerInfo.name,
        oldReportsToEmployeeId: oldEmp,
        oldReportsToOwnerId: oldOwner,
        directReportIds: [],
      });
    },
    [ownerInfo, clearDragUi, mutateReporting, queryClient, selectedOutletId, employees]
  );

  const handleDropOnEmployee = useCallback(
    (e: React.DragEvent, employeeId: string) => handleDropOnTarget(e, { employeeId }),
    [handleDropOnTarget]
  );

  const onEmployeeDragStart = useCallback((e: React.DragEvent, id: string, name: string) => {
    e.dataTransfer.setData('employeeId', id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData('employeeName', name);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedEmployeeId(id);
  }, []);

  const handleDragEndRow = useCallback(() => {
    clearDragUi();
  }, [clearDragUi]);

  if (!selectedOutletId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <div className="text-center animate-fade-in">
          <p className="text-amber-600 text-lg">Select an outlet first.</p>
        </div>
      </div>
    );
  }

  if (!ownerInfo) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-fade-in">
        <h1 className="text-2xl font-bold text-emerald-900">Hierarchy</h1>
        <p className="text-amber-700 mt-4">Sign in as the outlet owner to view the reporting tree.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-emerald-900">Hierarchy</h1>
          {reportingMutation.isPending && (
            <span className="text-xs text-emerald-600 font-medium animate-pulse">Syncing…</span>
          )}
        </div>
        <p className="text-emerald-800/90 mt-1 text-sm leading-relaxed">
          <strong>Owner</strong> at the top. Everyone underneath reports to the person (or owner) above them.
          <strong className="inline-flex items-center gap-0.5 mx-1"><Plus className="h-3.5 w-3.5" /></strong>
          assigns a direct report. <strong>Drag</strong> someone onto the owner or another person to change who they report to.
          Role labels show <em>role · outlet role</em> from Staff. The tree updates right away; the server syncs in the
          background.
        </p>
        {hierarchyNotice && (
          <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">{hierarchyNotice}</p>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 sm:p-6 shadow-sm">
          <div
            onDragOver={(e) => e.preventDefault()}
            className="rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 to-white p-4 mb-4"
          >
            <div
              onDragOver={(e) => handleDragOver(e, DROP_OWNER_KEY)}
              onDragLeave={handleDragLeaveRow}
              onDrop={(e) => handleDropOnTarget(e, 'owner')}
              className={`flex items-center gap-2 sm:gap-3 rounded-xl p-3 -m-1 transition-colors ${
                dropTargetId === DROP_OWNER_KEY ? 'ring-2 ring-emerald-400 ring-offset-2 bg-white' : ''
              }`}
            >
              {peopleTree.length > 0 ? (
                <button
                  type="button"
                  draggable={false}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOwnerBranchExpanded((v) => !v);
                  }}
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-amber-800/80 hover:bg-amber-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 transition-colors duration-200"
                  aria-expanded={ownerBranchExpanded}
                  aria-label={
                    ownerBranchExpanded
                      ? `Collapse staff under ${ownerInfo.name}`
                      : `Expand staff under ${ownerInfo.name}`
                  }
                >
                  <ChevronRight
                    className={`h-5 w-5 transition-transform duration-300 ease-out ${ownerBranchExpanded ? 'rotate-90' : 'rotate-0'}`}
                    style={{ transitionTimingFunction: TREE_EASE }}
                    aria-hidden
                  />
                </button>
              ) : (
                <div className="w-9 h-9 shrink-0" aria-hidden />
              )}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shrink-0">
                <Crown className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-lg">{ownerInfo.name}</p>
                <p className="text-sm text-gray-600">Owner</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDirectReportPicker({ kind: 'owner', ownerId: ownerInfo.id, managerName: ownerInfo.name })
                }
                className="shrink-0 p-2 rounded-lg text-emerald-600 hover:bg-emerald-100"
                title="Add someone who reports to you"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {peopleTree.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">
              No staff yet, or no one is assigned to report to you. Add people in <strong>Staff</strong> and set{' '}
              <strong>Reports to</strong> to the owner or a manager.
            </p>
          ) : (
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                ownerBranchExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
              style={{ transitionTimingFunction: TREE_EASE }}
            >
              <div className="min-h-0 overflow-hidden" aria-hidden={!ownerBranchExpanded}>
                <div
                  className={`space-y-1 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                    ownerBranchExpanded ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {peopleTree.map((n) => (
                    <EmpBranch
                      key={String(n.emp._id)}
                      node={n}
                      depth={0}
                      draggedEmployeeId={draggedEmployeeId}
                      dropTargetId={dropTargetId}
                      onEmployeeDragStart={onEmployeeDragStart}
                      onDragEnd={handleDragEndRow}
                      onDragOverTarget={handleDragOver}
                      onDragLeaveTarget={handleDragLeaveRow}
                      onDropOnEmployee={handleDropOnEmployee}
                      onOpenDirectReport={(id, name) =>
                        setDirectReportPicker({ kind: 'employee', managerId: id, managerName: name })
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {reportingMutation.isError && (
        <p className="mt-3 text-red-600 text-sm">{getApiErrorMessage(reportingMutation.error)}</p>
      )}

      {pendingMove && ownerInfo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-slide-up relative">
            <div className="p-6 border-b border-gray-100 pr-12">
              <h2 className="text-xl font-semibold text-gray-900">Move {pendingMove.draggedName}?</h2>
              <p className="text-sm text-gray-600 mt-2">
                <strong>{pendingMove.directReports.length} direct report(s):</strong>{' '}
                {pendingMove.directReports.map((d) => d.name).join(', ')}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                New manager for <strong>{pendingMove.draggedName}</strong>: <strong>{pendingMove.targetLabel}</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPendingMove(null)}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6 space-y-3">
              <button
                type="button"
                disabled={reportingMutation.isPending}
                onClick={() =>
                  mutateReporting({
                    kind: 'move',
                    draggedId: pendingMove.draggedId,
                    target: pendingMove.target,
                    mode: 'withTeam',
                    ownerId: ownerInfo.id,
                    ownerName: ownerInfo.name,
                    oldReportsToEmployeeId: pendingMove.oldReportsToEmployeeId,
                    oldReportsToOwnerId: pendingMove.oldReportsToOwnerId,
                    directReportIds: [],
                  })
                }
                className="w-full text-left rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 hover:bg-emerald-50 transition-colors disabled:opacity-50"
              >
                <p className="font-semibold text-emerald-900">Move with team</p>
                <p className="text-sm text-gray-600 mt-1">
                  Everyone keeps reporting to {pendingMove.draggedName}. Only {pendingMove.draggedName}&apos;s manager changes to{' '}
                  <strong>{pendingMove.targetLabel}</strong> — the subtree moves together.
                </p>
              </button>
              <button
                type="button"
                disabled={reportingMutation.isPending}
                onClick={() =>
                  mutateReporting({
                    kind: 'move',
                    draggedId: pendingMove.draggedId,
                    target: pendingMove.target,
                    mode: 'singleOnly',
                    ownerId: ownerInfo.id,
                    ownerName: ownerInfo.name,
                    oldReportsToEmployeeId: pendingMove.oldReportsToEmployeeId,
                    oldReportsToOwnerId: pendingMove.oldReportsToOwnerId,
                    directReportIds: pendingMove.directReports.map((d) => d._id),
                  })
                }
                className="w-full text-left rounded-xl border border-gray-200 bg-gray-50/80 p-4 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <p className="font-semibold text-gray-900">Move {pendingMove.draggedName} only</p>
                <p className="text-sm text-gray-600 mt-1">
                  Direct reports will report to <strong>{pendingMove.previousManagerLabel}</strong> instead (where{' '}
                  {pendingMove.draggedName} reported before). {pendingMove.draggedName} moves under{' '}
                  <strong>{pendingMove.targetLabel}</strong>.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPendingMove(null)}
                className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {directReportPicker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up relative">
            <div className="p-6 border-b border-gray-100 pr-12">
              <h2 className="text-xl font-semibold text-gray-900">Set direct report</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Choose who will report to <strong>{directReportPicker.managerName}</strong>. Existing reporting lines update
                automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={closeDirectReportPicker}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff member</label>
                <SearchableSelect
                  value={selectedSubordinateId}
                  onChange={setSelectedSubordinateId}
                  options={directReportStaffOptions}
                  placeholder="Select…"
                  searchPlaceholder="Search staff…"
                  allowClear
                  noOptionsText="No eligible staff"
                  emptyText="No matches"
                />
              </div>
              {reportingMutation.isError && (
                <p className="text-red-600 text-sm">{getApiErrorMessage(reportingMutation.error)}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedSubordinateId) return;
                    if (directReportPicker.kind === 'owner') {
                      mutateReporting({
                        kind: 'simple',
                        employeeId: selectedSubordinateId,
                        reportsToOwnerId: directReportPicker.ownerId,
                        reportsToEmployeeId: null,
                      });
                    } else {
                      mutateReporting({
                        kind: 'simple',
                        employeeId: selectedSubordinateId,
                        reportsToEmployeeId: directReportPicker.managerId,
                        reportsToOwnerId: null,
                      });
                    }
                  }}
                  disabled={!selectedSubordinateId || reportingMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {reportingMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={closeDirectReportPicker}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
