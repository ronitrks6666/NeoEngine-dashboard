import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import {
  assetsApi,
  type AssetCategory,
  type AssetRecord,
  type AssetStatus,
} from '@/api/assets';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListSearchBar } from '@/components/ListSearchBar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Package, Plus, Pencil, Trash2, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_FILTERS: Array<{ key: 'all' | AssetStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'returned', label: 'Returned' },
  { key: 'damaged', label: 'Damaged' },
];

const CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: 'device', label: 'Device' },
  { value: 'uniform', label: 'Uniform' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'other', label: 'Other' },
];

function statusBadge(status: AssetStatus) {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700';
    case 'returned':
      return 'bg-gray-100 text-gray-600';
    case 'damaged':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function categoryLabel(c: string) {
  return CATEGORIES.find((x) => x.value === c)?.label || c;
}

type FormState = {
  name: string;
  category: AssetCategory;
  valueInINR: string;
  assignedTo: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  name: '',
  category: 'device',
  valueInINR: '',
  assignedTo: '',
  notes: '',
});

export function AssetsPage() {
  const { selectedOutletId } = useOutletStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | AssetStatus>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AssetRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['owner-assets', selectedOutletId, statusFilter, debouncedSearch],
    queryFn: () =>
      assetsApi.getOwnerAssets({
        outletId: selectedOutletId || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch.trim() || undefined,
      }),
    enabled: !!selectedOutletId,
  });

  const { data: employeesRaw } = useQuery({
    queryKey: ['assets-staff', selectedOutletId],
    queryFn: () => employeeApi.getMyEmployees({ outletId: selectedOutletId!, limit: 200 }),
    enabled: !!selectedOutletId && modalOpen,
  });

  const employees = useMemo(() => {
    const list = employeesRaw?.data?.employees ?? employeesRaw?.employees ?? [];
    return Array.isArray(list) ? list : [];
  }, [employeesRaw]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['owner-assets'] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      const value = Number(form.valueInINR);
      if (!name) throw new Error('Asset name is required');
      if (!form.assignedTo) throw new Error('Assign to a staff member');
      if (!Number.isFinite(value) || value < 0) throw new Error('Enter a valid value in INR');
      const payload = {
        name,
        category: form.category,
        valueInINR: value,
        assignedTo: form.assignedTo,
        notes: form.notes.trim() || undefined,
      };
      if (editing?._id) return assetsApi.updateAsset(editing._id, payload);
      return assetsApi.createAsset(payload);
    },
    onSuccess: async () => {
      await invalidate();
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm());
      setFormError(null);
    },
    onError: (err) => setFormError(getApiErrorMessage(err) || 'Failed to save asset'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (asset: AssetRecord) => {
    setEditing(asset);
    setForm({
      name: asset.name || '',
      category: asset.category || 'other',
      valueInINR: String(asset.valueInINR ?? ''),
      assignedTo: asset.assignedTo?._id || '',
      notes: asset.notes || '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const setStatus = async (asset: AssetRecord, status: AssetStatus) => {
    setBusyId(asset._id);
    try {
      await assetsApi.updateAssetStatus(asset._id, status);
      await invalidate();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (asset: AssetRecord) => {
    if (!window.confirm(`Delete “${asset.name}”? This cannot be undone.`)) return;
    setBusyId(asset._id);
    try {
      await assetsApi.deleteAsset(asset._id);
      await invalidate();
    } finally {
      setBusyId(null);
    }
  };

  if (!selectedOutletId) {
    return <div className="p-6 text-amber-600">Select an outlet first.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset management</h1>
          <p className="text-gray-500 mt-0.5">
            Track devices, uniforms, and other items assigned to staff
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 shadow-sm w-fit"
        >
          <Plus className="h-4 w-4" /> Assign asset
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <ListSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or category"
          className="sm:min-w-[18rem] flex-1"
          id="assets-search"
          aria-label="Search assets"
        />
        <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-100 w-fit">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                statusFilter === f.key
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : assets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No assets yet</p>
          <p className="text-sm text-gray-400 mt-1">Assign a device or uniform to a staff member</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in-stagger">
          {assets.map((asset) => (
            <div
              key={asset._id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-teal-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900 truncate">{asset.name}</h3>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-lg ${statusBadge(asset.status)}`}
                    >
                      {asset.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {categoryLabel(asset.category)} · ₹
                    {Number(asset.valueInINR || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(asset)}
                    className="p-2 rounded-lg text-gray-400 hover:text-teal-700 hover:bg-teal-50"
                    aria-label="Edit asset"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(asset)}
                    disabled={busyId === asset._id}
                    className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    aria-label="Delete asset"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm">
                <p className="text-gray-900 font-medium">
                  {asset.assignedTo?.name || 'Unassigned'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {asset.assignedDate
                    ? `Assigned ${format(new Date(asset.assignedDate), 'MMM d, yyyy')}`
                    : 'No assign date'}
                  {asset.outletId?.name ? ` · ${asset.outletId.name}` : ''}
                </p>
              </div>

              {asset.notes ? (
                <p className="text-xs text-gray-500 mt-3 line-clamp-2">{asset.notes}</p>
              ) : null}

              {asset.status === 'active' ? (
                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    type="button"
                    disabled={busyId === asset._id}
                    onClick={() => setStatus(asset, 'returned')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Mark returned
                  </button>
                  <button
                    type="button"
                    disabled={busyId === asset._id}
                    onClick={() => setStatus(asset, 'damaged')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-100 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> Mark damaged
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={busyId === asset._id}
                    onClick={() => setStatus(asset, 'active')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 disabled:opacity-50"
                  >
                    Reactivate
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 relative">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-white/90 hover:bg-white/20 z-10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-6 py-5">
              <h2 className="text-xl font-bold text-white">
                {editing ? 'Edit asset' : 'Assign asset'}
              </h2>
              <p className="text-teal-100 text-sm mt-0.5">Issue an item to outlet staff</p>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                saveMutation.mutate();
              }}
            >
              {formError ? (
                <p className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
                  {formError}
                </p>
              ) : null}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="e.g. iPad #3, Chef jacket M"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, category: e.target.value as AssetCategory }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Value (INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.valueInINR}
                    onChange={(e) => setForm((p) => ({ ...p, valueInINR: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="0"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Assigned to
                </label>
                <select
                  value={form.assignedTo}
                  onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white"
                  required
                >
                  <option value="">Select staff…</option>
                  {employees.map((emp: { _id: string; name: string }) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                  placeholder="Optional condition, serial, etc."
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex-1 px-5 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Assign'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
