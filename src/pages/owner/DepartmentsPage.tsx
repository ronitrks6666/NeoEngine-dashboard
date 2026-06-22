import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Building2, Plus, X } from 'lucide-react';

export function DepartmentsPage() {
  const { selectedOutletId } = useOutletStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['departments', selectedOutletId],
    queryFn: () => employeeApi.getDepartments(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  const createMutation = useMutation({
    mutationFn: () => employeeApi.createDepartment({ name: name.trim(), outletId: selectedOutletId! }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['departments', selectedOutletId] });
      setShowCreate(false);
      setName('');
    },
  });

  const departments = data?.data?.departments ?? [];

  if (!selectedOutletId) {
    return <div className="p-6 text-amber-600">Select an outlet first.</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-7 w-7 text-emerald-600" /> Departments
          </h1>
          <p className="text-gray-500 mt-1">Organize master roles under departments (Kitchen, Front desk, etc.)</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add department
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : departments.length === 0 ? (
        <p className="text-gray-500 text-center py-12 border border-dashed rounded-2xl">No departments yet.</p>
      ) : (
        <ul className="space-y-2">
          {departments.map((d: { _id: string; name: string }) => (
            <li key={d._id} className="px-4 py-3 rounded-xl border border-gray-200 bg-white font-medium text-gray-900">
              {d.name}
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button type="button" onClick={() => setShowCreate(false)} className="absolute top-4 right-4 text-gray-400"><X className="h-5 w-5" /></button>
            <h2 className="text-lg font-semibold mb-4">New department</h2>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kitchen" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 mb-4" />
            {createMutation.isError && <p className="text-red-600 text-sm mb-2">{getApiErrorMessage(createMutation.error)}</p>}
            <button type="button" disabled={!name.trim() || createMutation.isPending} onClick={() => createMutation.mutate()} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50">
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
