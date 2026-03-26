import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOutletStore } from '@/stores/outletStore';
import { useAuth } from '@/hooks/useAuth';
import type { Owner } from '@/types/auth';
import { employeeApi } from '@/api/employee';
import { overtimeApi } from '@/api/overtime';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListSearchBar } from '@/components/ListSearchBar';
import { SearchableSelect, type SearchableSelectOption } from '@/components/SearchableSelect';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { UserPlus, Pencil, Trash2, FileText, ExternalLink, Plus, Shield, Briefcase, X, Loader2, Eye, EyeOff } from 'lucide-react';

function employeeRoleSubtitle(
  activeRoleId?: { name?: string; parentRoleId?: { name?: string } } | string | null
): string {
  if (!activeRoleId || typeof activeRoleId === 'string') return 'No role assigned';
  const sub = activeRoleId.name;
  const master = activeRoleId.parentRoleId?.name;
  if (sub && master) return `${sub} · ${master}`;
  return sub || master || 'No role assigned';
}

/** Form value: staff id or `owner:<ownerId>` for reports-to */
const REPORTS_TO_OWNER_PREFIX = 'owner:';

function managerNameOnCard(e: {
  reportsToEmployeeId?: { name?: string } | string | null;
  reportsToOwnerId?: { name?: string } | string | null;
}): string | null {
  const o = e.reportsToOwnerId;
  if (o && typeof o === 'object' && o.name?.trim()) return o.name.trim();
  const r = e.reportsToEmployeeId;
  if (r && typeof r === 'object' && r.name?.trim()) return r.name.trim();
  return null;
}

const createSchema = z.object({
  name: z.string().min(1, 'Name required'),
  phone: z.string().regex(/^\d{10}$/, 'Enter exactly 10 digits'),
  tempPassword: z.string().min(6, 'Min 6 characters'),
  /** Master role — server creates outlet role Chef-1, Chef-2, … */
  parentRoleId: z.string().optional(),
  /** Legacy / voice: pre-picked outlet role id */
  activeRoleId: z.string().optional(),
  reportsToTarget: z.string().optional(),
});

const editSchema = z.object({
  name: z.string().min(1, 'Name required'),
  phone: z.string().min(10, 'Valid phone required'),
  shiftType: z.enum(['Day', 'Night']).optional(),
  activeRoleId: z.string().optional(),
  salary: z.union([z.number(), z.string()]).optional().transform((v) => {
    if (v === '' || v == null) return undefined;
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(n) ? undefined : n;
  }),
  minHoursPerDay: z.union([z.number(), z.string()]).optional().transform((v) => {
    if (v === '' || v == null) return undefined;
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(n) ? undefined : n;
  }),
  punchInTime: z.string().optional(),
  upiId: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

type StaffCardRow = {
  _id: string;
  name: string;
  phone: string;
  activeRoleId?: { name?: string; parentRoleId?: { name?: string } } | { name: string } | string;
  shiftType?: string;
  isActive?: boolean;
  reportsToEmployeeId?: { name?: string } | string | null;
  reportsToOwnerId?: { name?: string } | string | null;
};

export function StaffPage() {
  const { selectedOutletId } = useOutletStore();
  const { user, role: authRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<{
    _id: string;
    name: string;
    phone: string;
    shiftType?: string;
    activeRoleId?: { _id?: string; name?: string; parentRoleId?: { name?: string } } | string;
    salary?: number | null;
    minHoursPerDay?: number | null;
    punchInTime?: string | null;
    upiId?: string | null;
  } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ _id: string; name: string } | null>(null);
  const [documentsFor, setDocumentsFor] = useState<{ _id: string; name: string } | null>(null);
  const [showCreateMasterRole, setShowCreateMasterRole] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newMasterRoleName, setNewMasterRoleName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleParentId, setNewRoleParentId] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const prevShowCreateRef = useRef(false);
  const skipNextCreateResetRef = useRef(false);
  const queryClient = useQueryClient();

  const { data: empData, isLoading } = useQuery({
    queryKey: ['my-employees', selectedOutletId, debouncedSearch],
    queryFn: () =>
      employeeApi.getMyEmployees({
        outletId: selectedOutletId ?? undefined,
        limit: 100,
        search: debouncedSearch.trim() || undefined,
      }),
    enabled: !!selectedOutletId,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['available-roles', selectedOutletId],
    queryFn: () => employeeApi.getAvailableRoles(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  const { data: parentRolesData } = useQuery({
    queryKey: ['parent-roles'],
    queryFn: () => employeeApi.getParentRoles(),
    enabled: !!editing || !!showCreate,
  });

  const { data: documentsData } = useQuery({
    queryKey: ['employee-documents', documentsFor?._id],
    queryFn: () => employeeApi.getDocuments(documentsFor!._id),
    enabled: !!documentsFor?._id,
  });

  const { data: overtimeData } = useQuery({
    queryKey: ['overtime-outlet', selectedOutletId, editing?._id],
    queryFn: () => overtimeApi.getOutletOvertime(selectedOutletId!, { employeeId: editing!._id }),
    enabled: !!selectedOutletId && !!editing?._id,
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateForm) => {
      const rt = d.reportsToTarget?.trim();
      return employeeApi.create({
        name: d.name,
        phone: d.phone,
        tempPassword: d.tempPassword,
        outletId: selectedOutletId!,
        parentRoleId: d.parentRoleId?.trim() || undefined,
        activeRoleId: d.activeRoleId?.trim() || undefined,
        ...(rt?.startsWith(REPORTS_TO_OWNER_PREFIX)
          ? { reportsToOwnerId: rt.slice(REPORTS_TO_OWNER_PREFIX.length) }
          : rt
            ? { reportsToEmployeeId: rt }
            : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-employees'] });
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['available-roles'] });
      setShowCreate(false);
      setShowCreateMasterRole(false);
      setShowCreateRole(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditForm }) => employeeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-employees'] });
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['available-roles'] });
      setEditing(null);
      editForm.reset();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => employeeApi.update(id, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-employees'] });
      setConfirmRemove(null);
    },
  });

  const createParentRoleMutation = useMutation({
    mutationFn: (name: string) => employeeApi.createParentRole(name, selectedOutletId ?? undefined),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['parent-roles'] });
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      setShowCreateMasterRole(false);
      setNewMasterRoleName('');
      const newId = (res as { data?: { parentRole?: { _id?: string } } })?.data?.parentRole?._id;
      if (newId) {
        form.setValue('parentRoleId', newId, { shouldValidate: true });
      }
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (payload: { name: string; parentRoleId: string; outletId: string }) =>
      employeeApi.createRole({ ...payload, outletId: selectedOutletId! }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['available-roles', selectedOutletId] });
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      setShowCreateRole(false);
      setNewRoleName('');
      setNewRoleParentId('');
      const newRoleId = (res as { data?: { role?: { id?: string } } })?.data?.role?.id;
      if (newRoleId) {
        editForm.setValue('activeRoleId', newRoleId);
      }
    },
  });

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: '',
      phone: '',
      tempPassword: 'staff123',
      parentRoleId: '',
      activeRoleId: '',
      reportsToTarget: '',
    },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', phone: '', shiftType: 'Day', activeRoleId: '', salary: undefined, minHoursPerDay: undefined, punchInTime: '', upiId: '' },
  });

  const employees = empData?.data?.employees ?? [];
  const roles = rolesData?.data?.roles ?? [];
  const parentRoles = parentRolesData?.data?.parentRoles ?? [];

  const parentRoleSelectOptions: SearchableSelectOption[] = useMemo(
    () =>
      (parentRoles as { _id: string; name: string }[]).map((r) => ({
        value: r._id,
        label: r.name,
      })),
    [parentRoles]
  );

  const ownerForReportsOption = useMemo(() => {
    if (authRole !== 'OWNER' || !user || !('id' in user)) return null;
    const o = user as Owner;
    if (!o.id) return null;
    return { id: o.id, name: o.name || 'Owner' };
  }, [authRole, user]);

  const reportsToSelectOptions: SearchableSelectOption[] = useMemo(() => {
    const staff = (employees as { _id: string; name: string; isActive?: boolean; activeRoleId?: unknown }[])
      .filter((e) => e.isActive !== false)
      .map((e) => ({
        value: e._id,
        label: e.name,
        subtitle: employeeRoleSubtitle(
          e.activeRoleId as { name?: string; parentRoleId?: { name?: string } } | undefined
        ),
      }));
    if (!ownerForReportsOption) return staff;
    return [
      {
        value: `${REPORTS_TO_OWNER_PREFIX}${ownerForReportsOption.id}`,
        label: ownerForReportsOption.name,
        subtitle: 'Owner',
      },
      ...staff,
    ];
  }, [employees, ownerForReportsOption]);

  // When create modal opens: default form (unless voice prefilled — skip one reset)
  useEffect(() => {
    if (!showCreate) {
      prevShowCreateRef.current = false;
      return;
    }
    if (prevShowCreateRef.current) return;
    prevShowCreateRef.current = true;
    if (skipNextCreateResetRef.current) {
      skipNextCreateResetRef.current = false;
    } else {
      form.reset({
        name: '',
        phone: '',
        tempPassword: 'staff123',
        parentRoleId: '',
        activeRoleId: '',
        reportsToTarget: '',
      });
    }
    setShowCreatePassword(false);
  }, [showCreate, form]);

  // Voice navigation: open create modal with prefilled data
  useEffect(() => {
    const state = location.state as { openCreate?: boolean; prefilledStaff?: Record<string, unknown> } | null;
    if (state?.openCreate && state?.prefilledStaff) {
      skipNextCreateResetRef.current = true;
      setShowCreate(true);
      const s = state.prefilledStaff;
      if (s.name) form.setValue('name', String(s.name));
      if (s.phone) form.setValue('phone', String(s.phone).replace(/\D/g, '').slice(0, 10));
      if (s.parentRoleId) form.setValue('parentRoleId', String(s.parentRoleId));
      if (s.activeRoleId) form.setValue('activeRoleId', String(s.activeRoleId));
      form.setValue('tempPassword', 'staff123');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, form]);

  const openEdit = (e: {
    _id: string;
    name: string;
    phone: string;
    shiftType?: string;
    activeRoleId?: { _id?: string; name?: string; parentRoleId?: { name?: string } } | string;
    salary?: number | null;
    minHoursPerDay?: number | null;
    punchInTime?: string | null;
    upiId?: string | null;
  }) => {
    setEditing(e);
    setShowCreateMasterRole(false);
    setShowCreateRole(false);
    setNewMasterRoleName('');
    setNewRoleName('');
    setNewRoleParentId('');
    const roleId = (e.activeRoleId as { _id?: string })?._id ?? (typeof e.activeRoleId === 'string' ? e.activeRoleId : '');
    editForm.reset({
      name: e.name,
      phone: e.phone,
      shiftType: (e.shiftType as 'Day' | 'Night') || 'Day',
      activeRoleId: roleId || '',
      salary: e.salary ?? undefined,
      minHoursPerDay: e.minHoursPerDay ?? undefined,
      punchInTime: e.punchInTime ?? '',
      upiId: e.upiId ?? '',
    });
  };

  if (!selectedOutletId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <div className="text-center animate-fade-in">
          <p className="text-amber-600 text-lg">Select an outlet first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 mt-0.5">Manage your team members</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:items-center">
          <ListSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name or phone"
            className="sm:max-w-xs flex-1"
            id="staff-search"
            aria-label="Search staff"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-emerald flex items-center gap-2 shrink-0"
          >
            <UserPlus className="h-5 w-5" /> Add staff
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in-stagger">
          {(employees as StaffCardRow[]).map((e) => (
            <div
              key={e._id}
              className={`group rounded-2xl border p-5 card-hover overflow-hidden ${
                e.isActive === false ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-emerald-100'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-xl font-bold text-emerald-600">
                  {e.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 [.card-hover:hover_&]:opacity-100 transition-opacity">
                  <button
                    onClick={() => setDocumentsFor({ _id: e._id, name: e.name })}
                    className="p-2 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors"
                    title="View documents"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEdit(e)}
                    className="p-2 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {e.isActive !== false && (
                    <button
                      onClick={() => setConfirmRemove({ _id: e._id, name: e.name })}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900 truncate">{e.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{e.phone}</p>
                <p className="text-xs text-gray-600 mt-1.5">
                  <span className="text-gray-500">Reports to:</span>{' '}
                  <span className="font-medium text-emerald-800">
                    {managerNameOnCard(e) ?? '—'}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700">
                    {(e.activeRoleId as { name?: string; parentRoleId?: { name?: string } })?.name ??
                      (e.activeRoleId as { parentRoleId?: { name?: string } })?.parentRoleId?.name ?? 'No role'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                    {e.shiftType ?? 'Day'}
                  </span>
                </div>
                {e.isActive === false && (
                  <p className="mt-2 text-xs text-amber-600 font-medium">Inactive</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {employees.length === 0 && !isLoading && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-gray-500">
            {debouncedSearch.trim() ? 'No staff match your search.' : 'No staff found'}
          </p>
          {!debouncedSearch.trim() && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Add your first staff member
            </button>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto animate-slide-up relative my-8">
            <div className="p-6 border-b border-gray-100 pr-12">
              <h2 className="text-xl font-semibold text-gray-900">Add staff member</h2>
              <p className="text-sm text-gray-500 mt-0.5">Create a new employee account</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setShowCreateMasterRole(false);
                setShowCreateRole(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6 max-h-[min(85vh,720px)] overflow-y-auto">
              {createMutation.isError && (
                <p className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{getApiErrorMessage(createMutation.error)}</p>
              )}
              <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                  <input
                    {...form.register('name')}
                    className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Full name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-red-600 text-sm mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <Controller
                    name="phone"
                    control={form.control}
                    render={({ field }) => (
                      <input
                        {...field}
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={10}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          field.onChange(digits);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 tracking-wide"
                        placeholder="10-digit number"
                      />
                    )}
                  />
                  {form.formState.errors.phone && (
                    <p className="text-red-600 text-sm mt-1">{form.formState.errors.phone.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Temporary password</label>
                  <div className="relative">
                    <input
                      {...form.register('tempPassword')}
                      type={showCreatePassword ? 'text' : 'password'}
                      className="w-full px-4 py-2.5 pr-12 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="Default: staff123"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCreatePassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                    >
                      {showCreatePassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Prefilled with <span className="font-mono">staff123</span> — change if needed.</p>
                  {form.formState.errors.tempPassword && (
                    <p className="text-red-600 text-sm mt-1">{form.formState.errors.tempPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Reports to <span className="font-normal text-gray-400">(optional)</span></label>
                  <SearchableSelect
                    value={form.watch('reportsToTarget') || ''}
                    onChange={(v) => form.setValue('reportsToTarget', v, { shouldValidate: true })}
                    options={reportsToSelectOptions}
                    placeholder="Choose owner or staff…"
                    searchPlaceholder="Search by name or role…"
                    noOptionsText={
                      ownerForReportsOption ? 'No matches' : 'Add the outlet owner account to pick them here'
                    }
                    emptyText="No matches"
                    allowClear
                  />
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/40 to-white p-4 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800">Master role</label>
                      <p className="text-xs text-gray-500">
                        Pick the job type (e.g. CHEF, MANAGER). The server creates the outlet role automatically:
                        <span className="font-medium text-gray-700"> Chef-1</span>, <span className="font-medium text-gray-700">Chef-2</span>, etc.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMasterRole(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200/80 bg-white text-emerald-800 text-sm font-medium shadow-sm hover:bg-emerald-50 transition-colors shrink-0"
                    >
                      <Shield className="h-4 w-4" /> New master role
                    </button>
                  </div>
                  <SearchableSelect
                    value={form.watch('parentRoleId') || ''}
                    onChange={(v) => form.setValue('parentRoleId', v, { shouldValidate: true })}
                    options={parentRoleSelectOptions}
                    placeholder="No role — assign later"
                    searchPlaceholder="Search master roles…"
                    noOptionsText="Create a master role first"
                    emptyText="No matches"
                    allowClear
                  />

                  {showCreateMasterRole && (
                    <div className="mt-1 p-4 rounded-xl border border-emerald-200/80 bg-white shadow-sm space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                          <Shield className="h-4 w-4" />
                        </span>
                        Create master role
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={newMasterRoleName}
                          onChange={(e) => setNewMasterRoleName(e.target.value)}
                          placeholder="e.g. MANAGER, CHEF"
                          className="flex-1 px-3 py-2.5 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500/20"
                        />
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => createParentRoleMutation.mutate(newMasterRoleName.trim())}
                            disabled={!newMasterRoleName.trim() || createParentRoleMutation.isPending}
                            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                          >
                            {createParentRoleMutation.isPending ? 'Creating…' : 'Create'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCreateMasterRole(false);
                              setNewMasterRoleName('');
                            }}
                            className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      {createParentRoleMutation.isError && (
                        <p className="text-red-600 text-xs">{getApiErrorMessage(createParentRoleMutation.error)}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
                        <span>Creating…</span>
                      </>
                    ) : (
                      'Create'
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={createMutation.isPending}
                    onClick={() => {
                      setShowCreate(false);
                      setShowCreateMasterRole(false);
                      setShowCreateRole(false);
                    }}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto animate-slide-up max-h-[90vh] overflow-y-auto relative">
            <div className="p-6 border-b border-gray-100 pr-12">
              <h2 className="text-xl font-semibold text-gray-900">Edit staff</h2>
              <p className="text-sm text-gray-500 mt-0.5">Update details for {editing.name}</p>
            </div>
            <button type="button" onClick={() => { setEditing(null); setShowCreateMasterRole(false); setShowCreateRole(false); }} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors z-10" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="p-6">
              {updateMutation.isError && (
                <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{getApiErrorMessage(updateMutation.error)}</p>
              )}
              <form
                onSubmit={editForm.handleSubmit((d) =>
                  updateMutation.mutate({
                    id: editing._id,
                    data: {
                      ...d,
                      activeRoleId: d.activeRoleId || undefined,
                      salary: d.salary ?? undefined,
                      minHoursPerDay: d.minHoursPerDay ?? undefined,
                      punchInTime: d.punchInTime?.trim() || undefined,
                      upiId: d.upiId?.trim() || undefined,
                    },
                  })
                )}
                className="space-y-6"
              >
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs">1</span>
                    Basic info
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Name</label>
                      <input {...editForm.register('name')} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" placeholder="Full name" />
                      {editForm.formState.errors.name && <p className="text-red-600 text-xs mt-1">{editForm.formState.errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Phone</label>
                      <input {...editForm.register('phone')} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" placeholder="10-digit phone" />
                      {editForm.formState.errors.phone && <p className="text-red-600 text-xs mt-1">{editForm.formState.errors.phone.message}</p>}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs">2</span>
                    Role & shift
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Role</label>
                      <div className="flex gap-2">
                        <select {...editForm.register('activeRoleId')} className="flex-1 px-4 py-2.5 rounded-xl border border-emerald-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                          <option value="">No role</option>
                          {roles.map((r: { _id: string; name: string }) => (
                            <option key={r._id} value={r._id}>{r.name}</option>
                          ))}
                        </select>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => { setShowCreateMasterRole(true); setShowCreateRole(false); }}
                            className="px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 text-sm font-medium"
                            title="Create Master role"
                          >
                            <Shield className="h-4 w-4" /> Master
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowCreateRole(true); setShowCreateMasterRole(false); setNewRoleParentId(parentRoles[0]?._id ?? ''); }}
                            className="px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 text-sm font-medium"
                            title="Create role"
                          >
                            <Briefcase className="h-4 w-4" /> Role
                          </button>
                        </div>
                      </div>

                      {showCreateMasterRole && (
                        <div className="mt-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                          <p className="text-sm font-medium text-gray-700 mb-2">Create Master role</p>
                          <div className="flex gap-2">
                            <input
                              value={newMasterRoleName}
                              onChange={(e) => setNewMasterRoleName(e.target.value)}
                              placeholder="e.g. MANAGER, CHEF"
                              className="flex-1 px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={() => createParentRoleMutation.mutate(newMasterRoleName.trim())}
                              disabled={!newMasterRoleName.trim() || createParentRoleMutation.isPending}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {createParentRoleMutation.isPending ? 'Creating...' : 'Create'}
                            </button>
                            <button type="button" onClick={() => { setShowCreateMasterRole(false); setNewMasterRoleName(''); }} className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-100">Cancel</button>
                          </div>
                          {createParentRoleMutation.isError && <p className="text-red-600 text-xs mt-2">{getApiErrorMessage(createParentRoleMutation.error)}</p>}
                        </div>
                      )}

                      {showCreateRole && (
                        <div className="mt-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                          <p className="text-sm font-medium text-gray-700 mb-2">Create role</p>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <select
                                value={newRoleParentId}
                                onChange={(e) => setNewRoleParentId(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500/20"
                              >
                                <option value="">Select Master role</option>
                                {parentRoles.map((r: { _id: string; name: string }) => (
                                  <option key={r._id} value={r._id}>{r.name}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => { setShowCreateMasterRole(true); setShowCreateRole(false); }}
                                className="px-2 py-2 rounded-lg border border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50 text-xs font-medium flex items-center gap-1"
                              >
                                <Plus className="h-3.5 w-3.5" /> Master
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <input
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                placeholder="Role name (e.g. Store Manager)"
                                className="flex-1 px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() => newRoleParentId && selectedOutletId && createRoleMutation.mutate({ name: newRoleName.trim(), parentRoleId: newRoleParentId, outletId: selectedOutletId })}
                                disabled={!newRoleName.trim() || !newRoleParentId || createRoleMutation.isPending}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {createRoleMutation.isPending ? 'Creating...' : 'Create'}
                              </button>
                              <button type="button" onClick={() => { setShowCreateRole(false); setNewRoleName(''); setNewRoleParentId(''); }} className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-100">Cancel</button>
                            </div>
                          </div>
                          {createRoleMutation.isError && <p className="text-red-600 text-xs mt-2">{getApiErrorMessage(createRoleMutation.error)}</p>}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Shift</label>
                      <select {...editForm.register('shiftType')} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                        <option value="Day">Day</option>
                        <option value="Night">Night</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs">3</span>
                    Payroll & attendance
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">Salary is per pay cycle (set in outlet settings). Payout uses approved overtime only.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Salary (per pay cycle)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        {...editForm.register('salary', { valueAsNumber: true })}
                        className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="e.g. 15000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Min hours per day</label>
                      <input
                        type="number"
                        min={0.5}
                        max={24}
                        step={0.5}
                        {...editForm.register('minHoursPerDay', { valueAsNumber: true })}
                        className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="e.g. 8"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Punch-in time (HH:mm)</label>
                      <input
                        type="time"
                        {...editForm.register('punchInTime')}
                        className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">UPI ID (for payout)</label>
                      <input
                        {...editForm.register('upiId')}
                        className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="e.g. user@okaxis"
                      />
                    </div>
                  </div>
                </section>

                {(overtimeData?.data?.requests ?? []).length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-xs">OT</span>
                      Overtime requests
                    </h3>
                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 max-h-32 overflow-y-auto">
                      <div className="divide-y divide-amber-100">
                        {(overtimeData?.data?.requests ?? []).map((ot: { _id: string; date: string; overtimeHours: number; status: string }) => (
                          <div key={ot._id} className="flex items-center justify-between px-4 py-2 text-sm">
                            <span className="text-gray-700">{new Date(ot.date).toLocaleDateString()} — {ot.overtimeHours}h</span>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                              ot.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              ot.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              ot.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {ot.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <button type="submit" disabled={updateMutation.isPending} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                  </button>
                  <button type="button" onClick={() => { setEditing(null); setShowCreateMasterRole(false); setShowCreateRole(false); }} className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Documents modal */}
      {documentsFor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 animate-slide-up max-h-[80vh] flex flex-col relative">
            <div className="p-6 border-b border-emerald-100 flex items-center justify-between pr-12">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
                <p className="text-sm text-emerald-700 mt-0.5">{documentsFor.name}</p>
              </div>
            </div>
            <button type="button" onClick={() => setDocumentsFor(null)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="flex-1 overflow-y-auto p-6">
              {!documentsData ? (
                <LoadingSpinner className="py-8" />
              ) : (documentsData?.data?.documents ?? []).length === 0 ? (
                <p className="text-gray-500 text-center py-8">No documents uploaded yet. Staff can upload from the app.</p>
              ) : (
                <div className="space-y-3">
                  {(documentsData?.data?.documents ?? []).map((doc: { _id: string; fileName: string; fileUrl: string; documentType?: string }) => (
                    <a
                      key={doc._id}
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl border border-emerald-100 hover:bg-emerald-50/50 transition-colors"
                    >
                      <FileText className="h-8 w-8 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{doc.fileName}</p>
                        <p className="text-xs text-gray-500 capitalize">{doc.documentType ?? 'Document'}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-emerald-600 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove confirm */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 animate-slide-up relative">
            <button type="button" onClick={() => setConfirmRemove(null)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <p className="text-gray-900 font-medium pr-8">Remove {confirmRemove.name}?</p>
            <p className="text-sm text-gray-500 mt-1">They will be marked inactive and won&apos;t be able to punch in.</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => deactivateMutation.mutate(confirmRemove._id)}
                disabled={deactivateMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Remove
              </button>
              <button onClick={() => setConfirmRemove(null)} className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
