import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type SubAdmin } from '@/api/admin';
import { getApiErrorMessage } from '@/api/auth';
import {
  SUB_ADMIN_ROLE_TEMPLATES,
  PERMISSION_LABELS,
  templateLabel,
  permissionsForTemplate,
  type PermissionSetupMode,
} from '@/constants/subAdminRoleTemplates';
import { SUPER_ADMIN_PERMISSIONS } from '@/constants/superAdminPermissions';
import { useSuperAdminPermissions } from '@/hooks/useSuperAdminPermissions';
import { Shield, UserPlus, X, Pencil, BarChart3, Users, Store, IndianRupee } from 'lucide-react';
import { billingCycleLabel } from '@/lib/billing';

type FormState = {
  name: string;
  email: string;
  password: string;
  phone: string;
  permissions: string[];
  permissionTemplate: string;
  setupMode: PermissionSetupMode;
  cloneFromId: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  phone: '',
  permissions: [],
  permissionTemplate: 'sales_rep',
  setupMode: 'template',
  cloneFromId: '',
  isActive: true,
};

function SalesPerformancePanel({ adminId, adminName }: { adminId: string; adminName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['sub-admin-performance', adminId],
    queryFn: () => adminApi.getSubAdminPerformance(adminId),
    enabled: !!adminId,
  });

  if (isLoading) return <p className="text-sm text-emerald-600 animate-pulse">Loading performance…</p>;
  if (!data) return null;

  const cards = [
    { label: 'Owners onboarded', value: data.ownersOnboarded, icon: Users },
    { label: 'Outlets sold', value: data.outletsOnboarded, icon: Store },
    { label: 'On free trial', value: data.onFreeTrial, icon: BarChart3 },
    { label: 'Payments closed', value: data.activePaid, icon: IndianRupee },
    { label: 'Revenue collected', value: `₹${data.totalRevenueClosedInr}`, icon: IndianRupee },
    { label: 'Outstanding due', value: `₹${data.totalDueInr}`, icon: IndianRupee },
  ];

  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
      <p className="text-sm font-bold text-emerald-900 flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        Sales performance — {adminName}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg bg-white border border-emerald-100 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-emerald-600">{c.label}</p>
            <p className="text-lg font-bold text-emerald-900">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(data.byBillingCycle || {}).map(([months, count]) =>
          count > 0 ? (
            <span key={months} className="rounded-full bg-white px-2 py-1 border border-emerald-200 text-emerald-800">
              {billingCycleLabel(Number(months))}: {count}
            </span>
          ) : null
        )}
      </div>
      {data.recentSubscriptions?.length > 0 && (
        <div className="max-h-32 overflow-y-auto text-xs space-y-1">
          {data.recentSubscriptions.slice(0, 5).map((r, i) => (
            <div key={i} className="flex justify-between gap-2 text-emerald-800 border-b border-emerald-100 py-1">
              <span>
                {r.outletName} · {r.paymentStatus}
                {r.couponCode ? ` · ${r.couponCode}` : ''}
              </span>
              <span className="font-semibold">₹{r.totalPaidInr}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SubAdminsPage() {
  const { isPrimary, can } = useSuperAdminPermissions();
  const canManage = can(SUPER_ADMIN_PERMISSIONS.SUB_ADMINS_MANAGE);

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<SubAdmin | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState('');

  const queryClient = useQueryClient();
  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['sub-admins'],
    queryFn: adminApi.getSubAdmins,
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createSubAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-admins'] });
      closeModal();
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof adminApi.updateSubAdmin>[1] }) =>
      adminApi.updateSubAdmin(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-admins'] });
      if (editing) queryClient.invalidateQueries({ queryKey: ['sub-admin-performance', editing.id] });
      closeModal();
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  const assignablePerms = useMemo(
    () =>
      isPrimary
        ? Object.values(SUPER_ADMIN_PERMISSIONS)
        : Object.values(SUPER_ADMIN_PERMISSIONS).filter(
            (p) => p !== SUPER_ADMIN_PERMISSIONS.SUB_ADMINS_MANAGE
          ),
    [isPrimary]
  );

  const closeModal = () => {
    setModal(null);
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, permissionTemplate: 'sales_rep', setupMode: 'template', permissions: permissionsForTemplate('sales_rep') });
    setModal('create');
    setEditing(null);
    setError('');
  };

  const openEdit = (admin: SubAdmin) => {
    const tpl = admin.permissionTemplate?.startsWith('clone:')
      ? 'clone'
      : admin.permissionTemplate && admin.permissionTemplate !== 'custom'
        ? 'template'
        : 'custom';
    setEditing(admin);
    setForm({
      name: admin.name,
      email: admin.email,
      password: '',
      phone: admin.phone,
      permissions: [...admin.permissions],
      permissionTemplate:
        admin.permissionTemplate?.startsWith('clone:')
          ? admin.permissionTemplate.replace('clone:', '')
          : admin.permissionTemplate || 'custom',
      setupMode: tpl === 'clone' ? 'clone' : tpl === 'template' ? 'template' : 'custom',
      cloneFromId: admin.permissionTemplate?.startsWith('clone:')
        ? admin.permissionTemplate.replace('clone:', '')
        : '',
      isActive: admin.isActive !== false,
    });
    setModal('edit');
    setError('');
  };

  const applySetupMode = (mode: PermissionSetupMode, templateKey?: string, cloneId?: string) => {
    if (mode === 'template' && templateKey) {
      setForm((f) => ({
        ...f,
        setupMode: mode,
        permissionTemplate: templateKey,
        permissions: permissionsForTemplate(templateKey),
        cloneFromId: '',
      }));
    } else if (mode === 'clone' && cloneId) {
      const src = admins.find((a) => a.id === cloneId);
      setForm((f) => ({
        ...f,
        setupMode: mode,
        cloneFromId: cloneId,
        permissions: src ? [...src.permissions] : f.permissions,
        permissionTemplate: `clone:${cloneId}`,
      }));
    } else {
      setForm((f) => ({ ...f, setupMode: 'custom', permissionTemplate: 'custom', cloneFromId: '' }));
    }
  };

  const togglePerm = (p: string) => {
    setForm((f) => ({
      ...f,
      setupMode: 'custom',
      permissionTemplate: 'custom',
      permissions: f.permissions.includes(p)
        ? f.permissions.filter((x) => x !== p)
        : [...f.permissions, p],
    }));
  };

  const buildPayload = () => {
    if (form.setupMode === 'clone' && form.cloneFromId) {
      return {
        permissionTemplate: `clone:${form.cloneFromId}`,
        cloneFromId: form.cloneFromId,
        permissions: form.permissions,
      };
    }
    if (form.setupMode === 'template') {
      return {
        permissionTemplate: form.permissionTemplate,
        permissions: permissionsForTemplate(form.permissionTemplate),
      };
    }
    return { permissionTemplate: 'custom', permissions: form.permissions };
  };

  const showPerformance =
    editing &&
    (editing.permissions.includes(SUPER_ADMIN_PERMISSIONS.SALES_PERFORMANCE_VIEW) ||
      editing.permissions.includes(SUPER_ADMIN_PERMISSIONS.OWNERS_CREATE));

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950 flex items-center gap-2">
            <Shield className="h-7 w-7 text-emerald-600" />
            Sub Super Admins
          </h1>
          <p className="text-emerald-700 mt-1">
            Role presets (sales, support, billing…) or custom permissions · clone existing admins
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700"
          >
            <UserPlus className="h-4 w-4" /> Add sub admin
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-emerald-50 text-emerald-800 text-left">
            <tr>
              <th className="px-6 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role preset</th>
              <th className="px-4 py-3 font-semibold">Permissions</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              {canManage && <th className="px-4 py-3 font-semibold" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-emerald-600">
                  Loading…
                </td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-emerald-600/70">
                  No sub admins yet
                </td>
              </tr>
            ) : (
              admins.map((a) => (
                <tr key={a.id} className="hover:bg-emerald-50/40">
                  <td className="px-6 py-4 font-semibold text-emerald-950">{a.name}</td>
                  <td className="px-4 py-4 text-emerald-800">{a.email}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-sky-100 text-sky-800 px-2.5 py-0.5 text-xs font-semibold">
                      {templateLabel(a.permissionTemplate)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {a.permissions.slice(0, 3).map((p) => (
                        <span
                          key={p}
                          className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"
                        >
                          {PERMISSION_LABELS[p as keyof typeof PERMISSION_LABELS]?.split(' ').slice(0, 2).join(' ') || p}
                        </span>
                      ))}
                      {a.permissions.length > 3 && (
                        <span className="text-xs text-emerald-600">+{a.permissions.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        a.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {a.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-700"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-emerald-950">
                {modal === 'create' ? 'Create sub admin' : `Edit — ${editing?.name}`}
              </h2>
              <button type="button" onClick={closeModal} className="p-1 rounded-lg hover:bg-emerald-50">
                <X className="h-5 w-5 text-emerald-700" />
              </button>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const permPayload = buildPayload();
                if (modal === 'create') {
                  createMutation.mutate({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    phone: form.phone,
                    ...permPayload,
                  });
                } else if (editing) {
                  updateMutation.mutate({
                    id: editing.id,
                    payload: {
                      name: form.name,
                      phone: form.phone,
                      isActive: form.isActive,
                      ...(form.password ? { password: form.password } : {}),
                      ...permPayload,
                    },
                  });
                }
              }}
            >
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <input
                className="w-full rounded-xl border border-emerald-200 px-4 py-2.5"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              {modal === 'create' ? (
                <input
                  className="w-full rounded-xl border border-emerald-200 px-4 py-2.5"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              ) : (
                <p className="text-sm text-emerald-700 px-1">{form.email}</p>
              )}
              <input
                className="w-full rounded-xl border border-emerald-200 px-4 py-2.5"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
              <input
                className="w-full rounded-xl border border-emerald-200 px-4 py-2.5"
                type="password"
                placeholder={modal === 'edit' ? 'New password (leave blank to keep)' : 'Password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={modal === 'create'}
              />

              {modal === 'edit' && (
                <label className="flex items-center gap-2 text-sm text-emerald-900">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-emerald-300 text-emerald-600"
                  />
                  Account active
                </label>
              )}

              <div className="rounded-xl border border-emerald-100 p-4 space-y-3">
                <p className="text-sm font-bold text-emerald-900">Permission setup</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['template', 'Role preset'],
                      ['custom', 'Custom'],
                      ['clone', 'Clone existing'],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        if (mode === 'template') applySetupMode('template', form.permissionTemplate || 'sales_rep');
                        else if (mode === 'clone') applySetupMode('clone', undefined, form.cloneFromId || admins[0]?.id || '');
                        else applySetupMode('custom');
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                        form.setupMode === mode
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {form.setupMode === 'template' && (
                  <div className="space-y-2">
                    <select
                      className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
                      value={form.permissionTemplate}
                      onChange={(e) => applySetupMode('template', e.target.value)}
                    >
                      {SUB_ADMIN_ROLE_TEMPLATES.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-emerald-600">
                      {SUB_ADMIN_ROLE_TEMPLATES.find((t) => t.key === form.permissionTemplate)?.description}
                    </p>
                  </div>
                )}

                {form.setupMode === 'clone' && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-emerald-800">
                      Copy permissions from
                      <select
                        className="mt-1 w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm"
                        value={form.cloneFromId}
                        onChange={(e) => applySetupMode('clone', undefined, e.target.value)}
                      >
                        <option value="">Select sub admin…</option>
                        {admins.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} — {templateLabel(a.permissionTemplate)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="text-xs text-emerald-600">
                      New admin gets the same permissions as the selected user.
                    </p>
                  </div>
                )}

                {(form.setupMode === 'custom' || form.setupMode === 'template') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto rounded-xl border border-emerald-50 p-2 bg-emerald-50/30">
                    {assignablePerms.map((p) => (
                      <label
                        key={p}
                        className={`flex items-center gap-2 text-xs cursor-pointer ${
                          form.setupMode === 'template' ? 'opacity-80' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(p)}
                          onChange={() => togglePerm(p)}
                          disabled={form.setupMode === 'template'}
                          className="rounded border-emerald-300 text-emerald-600"
                        />
                        {PERMISSION_LABELS[p as keyof typeof PERMISSION_LABELS]}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {modal === 'edit' && showPerformance && editing && (
                <SalesPerformancePanel adminId={editing.id} adminName={editing.name} />
              )}

              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving…'
                  : modal === 'create'
                    ? 'Create sub admin'
                    : 'Save changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
