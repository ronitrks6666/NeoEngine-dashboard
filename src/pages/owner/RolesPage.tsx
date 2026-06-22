import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SearchableSelect } from '@/components/SearchableSelect';
import { X, Pencil, Users, ListChecks, ChevronDown, ChevronUp } from 'lucide-react';

type StaffRow = {
  _id: string;
  name: string;
  activeRoleId?: string | null;
  activeRoleName?: string | null;
};

type RoleOverview = {
  _id: string;
  name: string;
  description?: string;
  staff: StaffRow[];
  staffCount: number;
  taskCount: number;
};

export function RolesPage() {
  const { selectedOutletId } = useOutletStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newDepartmentId, setNewDepartmentId] = useState('');
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);

  const [editingMaster, setEditingMaster] = useState<RoleOverview | null>(null);
  const [masterName, setMasterName] = useState('');
  const [masterDescription, setMasterDescription] = useState('');

  const [editingStaff, setEditingStaff] = useState<{
    staff: StaffRow;
    masterRoleId: string;
    masterRoleName: string;
    taskCount: number;
  } | null>(null);
  const [targetActiveRoleId, setTargetActiveRoleId] = useState('');

  const { data: departmentsData } = useQuery({
    queryKey: ['departments', selectedOutletId],
    queryFn: () => employeeApi.getDepartments(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['roles-overview', selectedOutletId],
    queryFn: () => employeeApi.getRolesOverview(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  const { data: freeRolesData } = useQuery({
    queryKey: ['free-roles', selectedOutletId, editingStaff?.masterRoleId, editingStaff?.staff._id],
    queryFn: () => employeeApi.getFreeRoles(selectedOutletId!),
    enabled: !!selectedOutletId && !!editingStaff,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      employeeApi.createParentRole(newRoleName.trim(), selectedOutletId ?? undefined, newDepartmentId || undefined),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['parent-roles'] }),
        queryClient.invalidateQueries({ queryKey: ['roles-overview'] }),
      ]);
      setShowCreate(false);
      setNewRoleName('');
      setNewDepartmentId('');
    },
  });

  const updateMasterMutation = useMutation({
    mutationFn: () =>
      employeeApi.updateParentRole(editingMaster!._id, {
        name: masterName.trim(),
        description: masterDescription.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles-overview'] });
      await queryClient.invalidateQueries({ queryKey: ['parent-roles'] });
      setEditingMaster(null);
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: () => employeeApi.assignRole(editingStaff!.staff._id, targetActiveRoleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles-overview'] });
      await queryClient.invalidateQueries({ queryKey: ['my-employees'] });
      setEditingStaff(null);
      setTargetActiveRoleId('');
    },
  });

  useEffect(() => {
    if (!editingMaster) return;
    setMasterName(editingMaster.name);
    setMasterDescription(editingMaster.description ?? '');
  }, [editingMaster]);

  const departments = departmentsData?.data?.departments ?? [];
  const departmentOptions = departments.map((d: { _id: string; name: string }) => ({ value: d._id, label: d.name }));
  const roles: RoleOverview[] = overviewData?.data?.roles ?? [];

  const rolesWithStaff = useMemo(() => roles.filter((r) => r.staffCount > 0), [roles]);
  const rolesEmpty = useMemo(() => roles.filter((r) => r.staffCount === 0), [roles]);

  const activeRoleOptions = useMemo(() => {
    if (!editingStaff || !freeRolesData) return [];
    const taskByParent = new Map(roles.map((r) => [r._id, r.taskCount]));
    const free = (freeRolesData?.data?.roles ?? []) as {
      _id: string;
      name?: string;
      parentRoleId?: { name?: string; _id?: string };
    }[];
    const currentId = editingStaff.staff.activeRoleId;
    const opts = free.map((r) => {
      const pid = r.parentRoleId?._id ? String(r.parentRoleId._id) : '';
      const tc = taskByParent.get(pid) ?? 0;
      return {
        value: r._id,
        label: r.name ?? r.parentRoleId?.name ?? 'Role slot',
        subtitle: `${r.parentRoleId?.name ?? 'Role'} · ${tc} task(s)/SOP(s)`,
      };
    });
    if (currentId && !opts.some((o) => o.value === currentId)) {
      opts.unshift({
        value: currentId,
        label: editingStaff.staff.activeRoleName ?? 'Current slot',
        subtitle: `${editingStaff.masterRoleName} · ${editingStaff.taskCount} task(s)/SOP(s)`,
      });
    }
    return opts;
  }, [editingStaff, freeRolesData, roles]);

  const selectedTargetTaskCount = useMemo(() => {
    if (!targetActiveRoleId) return null;
    const opt = activeRoleOptions.find((o) => o.value === targetActiveRoleId);
    const match = opt?.subtitle?.match(/· (\d+) task/);
    return match ? Number(match[1]) : null;
  }, [targetActiveRoleId, activeRoleOptions]);

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-500 mt-0.5">Master roles only — staff slots like Waiter-1 are managed automatically</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 shadow-sm flex items-center gap-2 w-fit"
        >
          <span>+</span> Create master role
        </button>
      </div>

      {!selectedOutletId ? (
        <div className="text-center py-16 text-amber-600 rounded-2xl border border-amber-100 bg-amber-50/50">
          Select an outlet to see staff by role
        </div>
      ) : isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="space-y-4">
          {rolesWithStaff.map((role) => {
            const expanded = expandedRoleId === role._id;
            return (
              <div key={role._id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 p-5">
                  <span className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg shrink-0">
                    {role.name?.charAt(0) || '?'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-semibold text-gray-900">{role.name}</h2>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                        {role.staffCount} staff
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                        <ListChecks className="h-3 w-3" /> {role.taskCount} tasks / SOPs
                      </span>
                    </div>
                    {role.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{role.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingMaster(role)}
                    className="p-2 rounded-lg hover:bg-teal-50 text-teal-600"
                    title="Edit master role"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedRoleId(expanded ? null : role._id)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  >
                    {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
                {expanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Staff in {role.name}
                    </p>
                    {role.staff.length === 0 ? (
                      <p className="text-sm text-gray-500">No staff assigned</p>
                    ) : (
                      <ul className="space-y-2">
                        {role.staff.map((s) => (
                          <li
                            key={s._id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 px-4 py-3"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{s.name}</p>
                              {s.activeRoleName && s.activeRoleName !== role.name && (
                                <p className="text-xs text-gray-400">Slot: {s.activeRoleName}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStaff({
                                  staff: s,
                                  masterRoleId: role._id,
                                  masterRoleName: role.name,
                                  taskCount: role.taskCount,
                                });
                                setTargetActiveRoleId(s.activeRoleId ?? '');
                              }}
                              className="text-sm font-medium text-teal-600 hover:text-teal-800 px-3 py-1.5 rounded-lg hover:bg-teal-50"
                            >
                              Change role
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {rolesEmpty.length > 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 p-5">
              <p className="text-sm font-medium text-gray-600 mb-3">Master roles with no staff in this outlet</p>
              <div className="flex flex-wrap gap-2">
                {rolesEmpty.map((r) => (
                  <span
                    key={r._id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-sm"
                  >
                    {r.name}
                    <span className="text-xs text-gray-400">({r.taskCount} tasks)</span>
                    <button type="button" onClick={() => setEditingMaster(r)} className="text-teal-600 hover:underline text-xs">
                      Edit
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative">
            <button type="button" onClick={() => setShowCreate(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Create master role</h2>
              <p className="text-sm text-gray-500 mt-0.5">e.g. WAITER, CHEF — not Waiter-1</p>
            </div>
            <div className="p-6 space-y-4">
              <input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Role name"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20"
              />
              {departmentOptions.length > 0 && (
                <SearchableSelect
                  value={newDepartmentId}
                  onChange={setNewDepartmentId}
                  options={departmentOptions}
                  placeholder="Department (optional)"
                  allowClear
                />
              )}
              {createMutation.isError && <p className="text-red-600 text-sm">{getApiErrorMessage(createMutation.error)}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!newRoleName.trim() || createMutation.isPending}
                  className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl font-medium disabled:opacity-50"
                >
                  Create
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 border rounded-xl">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingMaster && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative">
            <button type="button" onClick={() => setEditingMaster(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Edit master role</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {editingMaster.staffCount} staff · {editingMaster.taskCount} tasks/SOPs linked
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={masterName} onChange={(e) => setMasterName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={masterDescription}
                  onChange={(e) => setMasterDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border resize-none"
                />
              </div>
              {updateMasterMutation.isError && (
                <p className="text-red-600 text-sm">{getApiErrorMessage(updateMasterMutation.error)}</p>
              )}
              <button
                type="button"
                onClick={() => updateMasterMutation.mutate()}
                disabled={updateMasterMutation.isPending || !masterName.trim()}
                className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {updateMasterMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingStaff && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative">
            <button
              type="button"
              onClick={() => {
                setEditingStaff(null);
                setTargetActiveRoleId('');
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Change role for {editingStaff.staff.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">Current master role: {editingStaff.masterRoleName}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-900">
                <p className="font-semibold flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4" />
                  {editingStaff.taskCount} task(s) / SOP(s) assigned to <strong>{editingStaff.masterRoleName}</strong>
                </p>
                <p className="mt-1.5 text-amber-800/90 text-xs leading-relaxed">
                  Moving staff to another master role changes which tasks they receive. Review task assignments before confirming.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Outlet role slot</label>
                <SearchableSelect
                  value={targetActiveRoleId}
                  onChange={setTargetActiveRoleId}
                  options={activeRoleOptions}
                  placeholder="Select available slot…"
                  noOptionsText="No free slots — create staff or free a slot first"
                />
                <p className="text-xs text-gray-400 mt-1.5">Shows free slots and current assignment. Sub-slots like Waiter-1 are not master roles.</p>
                {selectedTargetTaskCount != null && targetActiveRoleId !== editingStaff.staff.activeRoleId && (
                  <p className="text-xs text-teal-700 mt-2 font-medium">
                    New role will have {selectedTargetTaskCount} task(s)/SOP(s) assigned.
                  </p>
                )}
              </div>
              {assignRoleMutation.isError && (
                <p className="text-red-600 text-sm">{getApiErrorMessage(assignRoleMutation.error)}</p>
              )}
              <button
                type="button"
                onClick={() => assignRoleMutation.mutate()}
                disabled={!targetActiveRoleId || assignRoleMutation.isPending}
                className="w-full py-2.5 bg-teal-600 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {assignRoleMutation.isPending ? 'Saving…' : 'Update staff role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
