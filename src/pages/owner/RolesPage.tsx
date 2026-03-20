import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { X } from 'lucide-react';

export function RolesPage() {
  const { selectedOutletId } = useOutletStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRole, setEditingRole] = useState<{ _id: string; name?: string; parentRoleId?: { name: string }; assignedEmployeeId?: { name: string }; minHoursPerDay?: number; punchInTime?: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: parentRolesData } = useQuery({
    queryKey: ['parent-roles'],
    queryFn: () => employeeApi.getParentRoles(),
  });

  const { data: availableRolesData, isLoading } = useQuery({
    queryKey: ['available-roles', selectedOutletId],
    queryFn: () => employeeApi.getAvailableRoles(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  const createMutation = useMutation({
    mutationFn: () => employeeApi.createParentRole(newRoleName.trim(), selectedOutletId ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-roles'] });
      queryClient.invalidateQueries({ queryKey: ['available-roles'] });
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      setShowCreate(false);
      setNewRoleName('');
    },
  });

  const parentRoles = parentRolesData?.data?.parentRoles ?? [];
  const availableRoles = availableRolesData?.data?.roles ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-500 mt-0.5">Master roles and outlet assignments</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2 w-fit"
        >
          <span>+</span> Create master role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Master roles */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-slide-up">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50/50 to-transparent">
            <h2 className="text-lg font-semibold text-gray-900">Master roles</h2>
            <p className="text-sm text-gray-500">Global role types (e.g. Manager, Waiter)</p>
          </div>
          <div className="p-6">
            {parentRoles.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in-stagger">
                {parentRoles.map((r: { _id: string; name: string }) => (
                  <div
                    key={r._id}
                    className="group rounded-xl border border-gray-200 p-4 card-hover bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-sm">
                        {r.name?.charAt(0) || '?'}
                      </span>
                      <span className="font-medium text-gray-900">{r.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No master roles yet</p>
                <button onClick={() => setShowCreate(true)} className="mt-2 text-teal-600 font-medium hover:underline">
                  Create one
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active roles */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-cyan-50/50 to-transparent">
            <h2 className="text-lg font-semibold text-gray-900">Active roles</h2>
            <p className="text-sm text-gray-500">Outlet-specific roles with assignments</p>
          </div>
          <div className="p-6">
            {!selectedOutletId ? (
              <div className="text-center py-12 text-amber-600">Select an outlet to see active roles</div>
            ) : isLoading ? (
              <LoadingSpinner className="py-16" />
            ) : availableRoles.length > 0 ? (
              <div className="space-y-3 animate-in-stagger">
                {availableRoles.map((r: { _id: string; name?: string; parentRoleId?: { name: string }; assignedEmployeeId?: { name: string } }) => (
                  <div
                    key={r._id}
                    className="group flex items-center justify-between rounded-xl border border-gray-200 p-4 card-hover bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-sm">
                        {(r.name ?? r.parentRoleId?.name ?? '?').charAt(0)}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{r.name ?? r.parentRoleId?.name ?? '-'}</p>
                        <p className="text-sm text-gray-500">{r.assignedEmployeeId?.name ?? 'Unassigned'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingRole(r)}
                      className="p-2 rounded-lg hover:bg-teal-50 text-gray-500 hover:text-teal-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      ✏️
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">No active roles for this outlet</div>
            )}
          </div>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 animate-slide-up relative">
            <div className="p-6 border-b border-gray-100 pr-12">
              <h2 className="text-xl font-semibold text-gray-900">Create master role</h2>
              <p className="text-sm text-gray-500 mt-0.5">Add a new role type (e.g. WAITER, MANAGER)</p>
            </div>
            <button type="button" onClick={() => setShowCreate(false)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="p-6">
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Role name (e.g. WAITER)"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 mb-4"
              />
              {createMutation.isError && (
                <p className="mb-4 text-red-600 text-sm">{getApiErrorMessage(createMutation.error)}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !newRoleName.trim()}
                  className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50"
                >
                  Create
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit role modal - for active role settings */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 animate-slide-up relative">
            <div className="p-6 border-b border-gray-100 pr-12">
              <h2 className="text-xl font-semibold text-gray-900">Role settings</h2>
              <p className="text-sm text-gray-500 mt-0.5">{editingRole.name ?? editingRole.parentRoleId?.name}</p>
            </div>
            <button type="button" onClick={() => setEditingRole(null)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="p-6">
              <p className="text-sm text-gray-500">Assigned to: {editingRole.assignedEmployeeId?.name ?? 'Unassigned'}</p>
              <p className="text-sm text-gray-400 mt-4">Assign role from Staff page</p>
              <button onClick={() => setEditingRole(null)} className="mt-2 w-full px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
