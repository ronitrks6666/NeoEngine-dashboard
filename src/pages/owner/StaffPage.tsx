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
import { ownerApi } from '@/api/owner';
import { overtimeApi } from '@/api/overtime';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListSearchBar } from '@/components/ListSearchBar';
import { SearchableSelect, type SearchableSelectOption } from '@/components/SearchableSelect';
import { TimePickerField } from '@/components/TimePickerField';
import { zPhone10 } from '@/lib/phoneValidation';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { UserPlus, Pencil, Trash2, FileText, ExternalLink, Plus, Shield, Briefcase, X, Loader2, Info, Building2 } from 'lucide-react';
import { StaffNotesPanel } from '@/components/StaffNotesPanel';
import { StaffMultiOutletSection } from '@/components/StaffMultiOutletSection';

function employeeRoleSubtitle(
  activeRoleId?: { name?: string; parentRoleId?: { name?: string } } | string | null
): string {
  if (!activeRoleId || typeof activeRoleId === 'string') return 'No role assigned';
  return activeRoleId.parentRoleId?.name?.trim() || 'No role assigned';
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
  phone: zPhone10,
  tempPassword: z.string().min(6, 'Min 6 characters'),
  /** Master role — server creates outlet role Chef-1, Chef-2, … */
  parentRoleId: z.string().optional(),
  /** Legacy / voice: pre-picked outlet role id */
  activeRoleId: z.string().optional(),
  reportsToTarget: z.string().optional(),
});

const editSchema = z.object({
  name: z.string().min(1, 'Name required'),
  phone: zPhone10,
  shiftType: z.enum(['Day', 'Night']).optional(),
  parentRoleId: z.string().optional(),
  activeRoleId: z.string().optional(),
  salary: z.any().optional().transform((v) => {
    if (v === '' || v == null) return undefined;
    const n = typeof v === 'string' ? parseFloat(v) : Number(v);
    return isNaN(n) ? undefined : n;
  }),
  minHoursPerDay: z.any().optional().transform((v) => {
    if (v === '' || v == null) return undefined;
    const n = typeof v === 'string' ? parseFloat(v) : Number(v);
    return isNaN(n) ? undefined : n;
  }),
  punchInTime: z.string().optional(),
  upiId: z.string().optional(),
  reportsToTarget: z.string().optional(),
  // Personal
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  secondaryPhone: z.string().optional(),
  guardianPhone: z.string().optional(),
  department: z.string().optional(),
  joiningDate: z.string().optional(),
  previousExperience: z.string().optional(),
  // Addresses
  localAddress: z.string().optional(),
  temporaryAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  locationLink: z.string().optional(),
  // Financial
  bankAccountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  panNumber: z.string().optional(),
  pfNumber: z.string().optional(),
  esicNumber: z.string().optional(),
  // Medical & Compliance
  hasMedicalCondition: z.boolean().optional(),
  medicalConditionNotes: z.string().optional(),
  bodyMarks: z.string().optional(),
  policeVerificationStatus: z.enum(['pending', 'verified', 'not_required']).optional(),
  policeVerificationNotes: z.string().optional(),
  // Status
  userStatus: z.enum(['active', 'on_hold']).optional(),
  userStatusReason: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

type StaffCardRow = {
  _id: string;
  name: string;
  phone: string;
  outletId?: string | { _id?: string; name?: string };
  metadata?: {
    multiOutletAccess?: boolean;
    multiOutletOutletIds?: string[];
  };
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
    // Personal
    dateOfBirth?: string;
    gender?: string;
    secondaryPhone?: string;
    guardianPhone?: string;
    department?: string;
    joiningDate?: string;
    previousExperience?: string;
    // Addresses
    localAddress?: string;
    temporaryAddress?: string;
    permanentAddress?: string;
    locationLink?: string;
    // Financial
    bankAccountNumber?: string;
    ifscCode?: string;
    panNumber?: string;
    pfNumber?: string;
    esicNumber?: string;
    // Medical
    hasMedicalCondition?: boolean;
    medicalConditionNotes?: string;
    bodyMarks?: string;
    // Compliance
    policeVerificationStatus?: string;
    policeVerificationNotes?: string;
    // Status
    userStatus?: string;
    userStatusReason?: string;
    metadata?: {
      multiOutletAccess?: boolean;
      multiOutletOutletIds?: string[];
    };
    outletId?: string | { _id?: string; name?: string };
  } | null>(null);
  const [multiOutletEnabled, setMultiOutletEnabled] = useState(false);
  const [multiOutletIds, setMultiOutletIds] = useState<string[]>([]);
  const [multiOutletPermMode, setMultiOutletPermMode] = useState<'keep' | 'reset'>('keep');
  const [multiOutletSnapshot, setMultiOutletSnapshot] = useState<{
    enabled: boolean;
    ids: string[];
  }>({ enabled: false, ids: [] });
  const [editMultiOutletError, setEditMultiOutletError] = useState<string | null>(null);
  const [editActiveTab, setEditActiveTab] = useState<'basic' | 'personal' | 'financial' | 'medical' | 'notes'>('basic');
  const [confirmRemove, setConfirmRemove] = useState<{ _id: string; name: string } | null>(null);
  const [reassignToId, setReassignToId] = useState<string>('');
  const [documentsFor, setDocumentsFor] = useState<{ _id: string; name: string } | null>(null);
  const [showCreateMasterRole, setShowCreateMasterRole] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newMasterRoleName, setNewMasterRoleName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleParentId, setNewRoleParentId] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const prevShowCreateRef = useRef(false);
  const skipNextCreateResetRef = useRef(false);
  const queryClient = useQueryClient();

  const { data: empData, isLoading } = useQuery({
    // showDeleted MUST be in the key so toggling triggers a fresh fetch
    queryKey: ['my-employees', selectedOutletId, debouncedSearch, showDeleted],
    queryFn: () =>
      employeeApi.getMyEmployees({
        outletId: selectedOutletId ?? undefined,
        limit: 100,
        search: debouncedSearch.trim() || undefined,
        includeInactive: showDeleted,
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
    enabled: !!selectedOutletId,
  });

  const { data: ownerOutlets = [] } = useQuery({
    queryKey: ['owner-outlets-all'],
    queryFn: () => ownerApi.getOutlets(),
    enabled: !!editing,
  });

  const editingPrimaryOutletId = useMemo(() => {
    if (!editing) return selectedOutletId ?? '';
    const raw = editing.outletId;
    if (raw && typeof raw === 'object' && raw._id) return String(raw._id);
    if (typeof raw === 'string' && raw) return raw;
    return selectedOutletId ?? '';
  }, [editing, selectedOutletId]);

  const multiOutletChanged = useMemo(() => {
    const sortKey = (ids: string[]) => [...ids].map(String).sort().join(',');
    return (
      multiOutletEnabled !== multiOutletSnapshot.enabled ||
      sortKey(multiOutletIds) !== sortKey(multiOutletSnapshot.ids)
    );
  }, [multiOutletEnabled, multiOutletIds, multiOutletSnapshot]);

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
      const parentId = d.parentRoleId?.trim();
      return employeeApi.create({
        name: d.name,
        phone: d.phone,
        tempPassword: d.tempPassword,
        outletId: selectedOutletId!,
        ...(parentId ? { parentRoleId: parentId } : {}),
        ...(rt?.startsWith(REPORTS_TO_OWNER_PREFIX)
          ? { reportsToOwnerId: rt.slice(REPORTS_TO_OWNER_PREFIX.length) }
          : rt
            ? { reportsToEmployeeId: rt }
            : {}),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-employees'] }),
        queryClient.invalidateQueries({ queryKey: ['hierarchy'] }),
        queryClient.invalidateQueries({ queryKey: ['available-roles'] })
      ]);
      setShowCreate(false);
      setShowCreateMasterRole(false);
      setShowCreateRole(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditForm }) => employeeApi.update(id, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-employees'] }),
        queryClient.invalidateQueries({ queryKey: ['hierarchy'] }),
        queryClient.invalidateQueries({ queryKey: ['available-roles'] }),
        queryClient.invalidateQueries({ queryKey: ['my-employees-suggestions'] })
      ]);
      setEditing(null);
      editForm.reset();
    },
    onError: (err) => {
      console.error('[updateMutation] failed:', err);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async ({ id, newManagerId }: { id: string; newManagerId?: string }) => {
      // 1. Reassign subordinates if provided
      if (newManagerId) {
        const subs = (employees as StaffCardRow[]).filter(
          (e) => (typeof e.reportsToEmployeeId === 'string' ? e.reportsToEmployeeId : (e.reportsToEmployeeId as any)?._id) === id
        );
        const payload = newManagerId.startsWith(REPORTS_TO_OWNER_PREFIX)
          ? { reportsToOwnerId: newManagerId.slice(REPORTS_TO_OWNER_PREFIX.length), reportsToEmployeeId: null }
          : { reportsToEmployeeId: newManagerId, reportsToOwnerId: null };

        await Promise.all(subs.map((s) => employeeApi.update(s._id, payload)));
      }
      // 2. Deactivate
      return employeeApi.update(id, { isActive: false });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-employees'] }),
        queryClient.invalidateQueries({ queryKey: ['hierarchy'] })
      ]);
      setConfirmRemove(null);
      setReassignToId('');
      setIsReassigning(false);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => employeeApi.update(id, { isActive: true }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-employees'] }),
        queryClient.invalidateQueries({ queryKey: ['hierarchy'] })
      ]);
    },
  });

  const createParentRoleMutation = useMutation({
    mutationFn: (name: string) => employeeApi.createParentRole(name, selectedOutletId ?? undefined),
    onSuccess: async (res) => {
      const created = (res as { data?: { parentRole?: { _id?: string; name?: string } } })?.data?.parentRole;
      const newId = created?._id ? String(created._id) : '';
      const newName = created?.name ?? '';

      if (newId) {
        queryClient.setQueryData(['parent-roles'], (prev: { data?: { parentRoles?: { _id: string; name: string }[] } } | undefined) => {
          const list = prev?.data?.parentRoles ?? [];
          if (list.some((r) => String(r._id) === newId)) return prev;
          return {
            ...prev,
            success: true,
            data: { parentRoles: [...list, { _id: newId, name: newName }].sort((a, b) => a.name.localeCompare(b.name)) },
          };
        });
        form.setValue('parentRoleId', newId, { shouldValidate: true });
        editForm.setValue('parentRoleId', newId, { shouldValidate: true });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['parent-roles'] }),
        queryClient.invalidateQueries({ queryKey: ['roles-overview', selectedOutletId] }),
        queryClient.invalidateQueries({ queryKey: ['hierarchy'] }),
      ]);
      setShowCreateMasterRole(false);
      setNewMasterRoleName('');
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: (payload: { name: string; parentRoleId: string; outletId: string }) =>
      employeeApi.createRole({ ...payload, outletId: selectedOutletId! }),
    onSuccess: async (res) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['available-roles', selectedOutletId] }),
        queryClient.invalidateQueries({ queryKey: ['hierarchy'] })
      ]);
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
    defaultValues: { name: '', phone: '', shiftType: 'Day', parentRoleId: '', activeRoleId: '', salary: undefined, minHoursPerDay: undefined, punchInTime: '', upiId: '' },
  });

  const employees = empData?.data?.employees ?? [];
  const roles = rolesData?.data?.roles ?? [];
  const parentRoles = parentRolesData?.data?.parentRoles ?? [];

  const parentRoleSelectOptions: SearchableSelectOption[] = useMemo(
    () =>
      (parentRoles as { _id: string; name: string }[]).map((r) => ({
        value: String(r._id),
        label: r.name,
      })),
    [parentRoles]
  );

  const outletRoleSelectOptions: SearchableSelectOption[] = useMemo(
    () =>
      (roles as { _id: string; name: string }[]).map((r) => ({
        value: r._id,
        label: r.name,
      })),
    [roles]
  );

  const shiftSelectOptions: SearchableSelectOption[] = useMemo(
    () => [
      { value: 'Day', label: 'Day' },
      { value: 'Night', label: 'Night' },
    ],
    []
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

  const openEdit = (e: typeof editing & { _id: string; name: string; phone: string }) => {
    if (!e) return;
    setEditing(e);
    setEditActiveTab('basic');
    setShowCreateMasterRole(false);
    setShowCreateRole(false);
    setNewMasterRoleName('');
    setNewRoleName('');
    setNewRoleParentId('');
    const roleId = (e.activeRoleId as { _id?: string })?._id ?? (typeof e.activeRoleId === 'string' ? e.activeRoleId : '');
    const parentRoleId =
      (e.activeRoleId as { parentRoleId?: { _id?: string } })?.parentRoleId?._id ??
      (typeof (e.activeRoleId as { parentRoleId?: string })?.parentRoleId === 'string'
        ? (e.activeRoleId as { parentRoleId: string }).parentRoleId
        : '');
    const reportsToEmp =
      typeof e.reportsToEmployeeId === 'object' && e.reportsToEmployeeId
        ? (e.reportsToEmployeeId as { _id?: string })._id
        : typeof e.reportsToEmployeeId === 'string'
          ? e.reportsToEmployeeId
          : '';
    const reportsToOwner =
      typeof e.reportsToOwnerId === 'object' && e.reportsToOwnerId
        ? (e.reportsToOwnerId as { _id?: string })._id
        : typeof e.reportsToOwnerId === 'string'
          ? e.reportsToOwnerId
          : '';
    const reportsToTarget = reportsToOwner
      ? `${REPORTS_TO_OWNER_PREFIX}${reportsToOwner}`
      : reportsToEmp
        ? String(reportsToEmp)
        : '';
    const primaryOutletId =
      (e.outletId as { _id?: string })?._id ??
      (typeof e.outletId === 'string' ? e.outletId : selectedOutletId ?? '');
    const meta = e.metadata ?? {};
    const multiEnabled =
      meta.multiOutletAccess === true && (meta.multiOutletOutletIds?.length ?? 0) > 1;
    const multiIds = multiEnabled
      ? (meta.multiOutletOutletIds ?? []).map(String)
      : [String(primaryOutletId)];
    setMultiOutletEnabled(multiEnabled);
    setMultiOutletIds(multiIds.length > 0 ? multiIds : [String(primaryOutletId)]);
    setMultiOutletPermMode('keep');
    setEditMultiOutletError(null);
    setMultiOutletSnapshot({
      enabled: multiEnabled,
      ids: multiIds.length > 0 ? multiIds : [String(primaryOutletId)],
    });
    editForm.reset({
      name: e.name,
      // Always normalise to last 10 digits — backend may store with country code prefix
      phone: String(e.phone ?? '').replace(/\D/g, '').slice(-10),
      shiftType: (e.shiftType as 'Day' | 'Night') || 'Day',
      parentRoleId: parentRoleId || '',
      activeRoleId: roleId || '',
      salary: e.salary ?? undefined,
      minHoursPerDay: e.minHoursPerDay ?? undefined,
      punchInTime: e.punchInTime ?? '',
      upiId: e.upiId ?? '',
      reportsToTarget,
      dateOfBirth: e.dateOfBirth ?? '',
      gender: (e.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say') ?? undefined,
      secondaryPhone: e.secondaryPhone ?? '',
      guardianPhone: e.guardianPhone ?? '',
      department: e.department ?? '',
      joiningDate: e.joiningDate ?? '',
      previousExperience: e.previousExperience ?? '',
      localAddress: e.localAddress ?? '',
      temporaryAddress: e.temporaryAddress ?? '',
      permanentAddress: e.permanentAddress ?? '',
      locationLink: e.locationLink ?? '',
      bankAccountNumber: e.bankAccountNumber ?? '',
      ifscCode: e.ifscCode ?? '',
      panNumber: e.panNumber ?? '',
      pfNumber: e.pfNumber ?? '',
      esicNumber: e.esicNumber ?? '',
      hasMedicalCondition: e.hasMedicalCondition ?? false,
      medicalConditionNotes: e.medicalConditionNotes ?? '',
      bodyMarks: e.bodyMarks ?? '',
      policeVerificationStatus: (e.policeVerificationStatus as 'pending' | 'verified' | 'not_required') ?? 'not_required',
      policeVerificationNotes: e.policeVerificationNotes ?? '',
      userStatus: (typeof e.userStatus === 'string' ? e.userStatus : (e.userStatus as any)?.status) ?? 'active',
      userStatusReason: (typeof e.userStatus === 'string' ? '' : (e.userStatus as any)?.reason) ?? e.userStatusReason ?? '',
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
            className="w-full min-w-0 sm:min-w-[19rem] sm:max-w-md flex-1"
            id="staff-search"
            aria-label="Search staff"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-emerald flex items-center gap-2 shrink-0"
          >
            <UserPlus className="h-5 w-5" /> Add staff
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shrink-0 ${
                showDeleted 
                  ? 'bg-amber-500 text-white shadow-amber' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Trash2 className="h-5 w-5" /> {showDeleted ? 'Showing Deleted' : 'See Deleted Staff'}
            </button>
            {showDeleted && (
              <button
                onClick={() => setShowDeleted(false)}
                className="p-2.5 bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
                title="Clear filter"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 bg-white/50 p-3 rounded-2xl border border-emerald-50">
        <p className="text-sm text-gray-500">
          {showDeleted ? 'Showing deleted staff' : 'Active roster'}
        </p>
        <p className="text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-900">
            {showDeleted 
              ? employees.filter((e: any) => e.isActive === false).length 
              : employees.filter((e: any) => e.isActive !== false).length}
          </span> staff members
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in-stagger">
          {(employees as StaffCardRow[])
            .filter((e) => showDeleted ? e.isActive === false : e.isActive !== false)
            .map((e) => (
            <div
              key={e._id}
              className={`group rounded-2xl border p-5 card-hover overflow-hidden ${
                e.isActive === false ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-emerald-100'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${
                  e.isActive === false ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {e.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              <div className="flex gap-1">
                  {/* Always show docs + edit + delete buttons */}
                  <button
                    type="button"
                    onClick={() => setDocumentsFor({ _id: e._id, name: e.name })}
                    className="p-2 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors"
                    title="View uploaded documents"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(e)}
                    className="p-2 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors"
                    title="Edit staff member"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {e.isActive !== false ? (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove({ _id: e._id, name: e.name })}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                      title="Delete staff member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    /* Reactivate button — always visible for deleted staff */
                    <button
                      type="button"
                      onClick={() => restoreMutation.mutate(e._id)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                      title="Reactivate staff member"
                    >
                      <Plus className="h-3 w-3" /> Reactivate
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
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${
                    e.isActive === false ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {(e.activeRoleId as { parentRoleId?: { name?: string } })?.parentRoleId?.name ?? 'No role'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                    {e.shiftType ?? 'Day'}
                  </span>
                  {e.metadata?.multiOutletAccess &&
                    (e.metadata.multiOutletOutletIds?.length ?? 0) > 1 && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-sky-100 text-sky-800 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        Multi-outlet
                      </span>
                    )}
                </div>
                {e.isActive === false && (
                  <div className="mt-3 pt-3 border-t border-amber-100 flex items-center gap-1.5 text-amber-700">
                    <Info className="h-3.5 w-3.5" />
                    <p className="text-xs font-medium">Deleted Staff</p>
                  </div>
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
                  <input
                    {...form.register('tempPassword')}
                    type="text"
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-sm"
                    placeholder="Default: staff123"
                  />
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
                      <label className="block text-sm font-semibold text-gray-800">Role</label>
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
                      <Shield className="h-4 w-4" /> New role
                    </button>
                  </div>
                  <SearchableSelect
                    value={form.watch('parentRoleId') || ''}
                    onChange={(v) => form.setValue('parentRoleId', v, { shouldValidate: true })}
                    options={parentRoleSelectOptions}
                    placeholder="No role — assign later"
                    searchPlaceholder="Search roles…"
                    noOptionsText="Create a role first"
                    emptyText="No matches"
                    allowClear
                  />

                  {showCreateMasterRole && (
                    <div className="mt-1 p-4 rounded-xl border border-emerald-200/80 bg-white shadow-sm space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                          <Shield className="h-4 w-4" />
                        </span>
                        Create role
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
              {editMultiOutletError && (
                <p className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100">
                  {editMultiOutletError}
                </p>
              )}
              {updateMutation.isError && (
                <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{getApiErrorMessage(updateMutation.error)}</p>
              )}
              {Object.keys(editForm.formState.errors).length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-700 text-sm border border-amber-100">
                  <p className="font-semibold mb-1">Please fix the following before saving:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {Object.entries(editForm.formState.errors).map(([field, err]) => (
                      <li key={field}><span className="capitalize">{field}</span>: {(err as any)?.message ?? 'Invalid value'}</li>
                    ))}
                  </ul>
                </div>
              )}
              <form
                onSubmit={editForm.handleSubmit(
                  (d) => {
                    if (multiOutletChanged && multiOutletEnabled && new Set(multiOutletIds).size < 2) {
                      setEditMultiOutletError(
                        'Select at least two outlets for multi-outlet access (primary + one more).'
                      );
                      return;
                    }
                    setEditMultiOutletError(null);
                    updateMutation.mutate({
                      id: editing._id,
                      data: (() => {
                        const rt = d.reportsToTarget?.trim();
                        const reportsPayload = rt?.startsWith(REPORTS_TO_OWNER_PREFIX)
                          ? {
                              reportsToOwnerId: rt.slice(REPORTS_TO_OWNER_PREFIX.length),
                              reportsToEmployeeId: null,
                            }
                          : rt
                            ? { reportsToEmployeeId: rt, reportsToOwnerId: null }
                            : {};
                        const { activeRoleId: _omitActiveRole, ...profile } = d;
                        const multiPayload = multiOutletChanged
                          ? {
                              multiOutletAccess: multiOutletEnabled,
                              multiOutletOutletIds: multiOutletEnabled ? multiOutletIds : undefined,
                              multiOutletPermissionMode: multiOutletPermMode,
                            }
                          : {};
                        return {
                          ...profile,
                          ...reportsPayload,
                          ...multiPayload,
                          parentRoleId: d.parentRoleId?.trim() ? d.parentRoleId.trim() : null,
                          salary: d.salary ?? undefined,
                          minHoursPerDay: d.minHoursPerDay ?? undefined,
                          punchInTime: d.punchInTime?.trim() || undefined,
                          upiId: d.upiId?.trim() || undefined,
                        };
                      })(),
                    });
                  },
                  (validationErrors) => {
                    // Log validation errors so they're visible in the console during debugging
                    console.warn('[EditForm] Validation failed, fix these fields before submit:', validationErrors);
                  }
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
                      <Controller
                        name="phone"
                        control={editForm.control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            maxLength={10}
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors tracking-wide"
                            placeholder="10-digit phone"
                          />
                        )}
                      />
                      {editForm.formState.errors.phone && <p className="text-red-600 text-xs mt-1">{editForm.formState.errors.phone.message}</p>}
                    </div>
                  </div>
                </section>

                <StaffMultiOutletSection
                  enabled={multiOutletEnabled}
                  onEnabledChange={setMultiOutletEnabled}
                  selectedOutletIds={multiOutletIds}
                  onSelectedOutletIdsChange={setMultiOutletIds}
                  primaryOutletId={editingPrimaryOutletId}
                  outlets={ownerOutlets}
                  permissionMode={multiOutletPermMode}
                  onPermissionModeChange={setMultiOutletPermMode}
                  showPermissionChoice={multiOutletChanged}
                  disabled={updateMutation.isPending}
                />

                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs">2</span>
                    Role & shift
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Role</label>
                      <div className="flex gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <SearchableSelect
                            value={editForm.watch('parentRoleId') || ''}
                            onChange={(v) => editForm.setValue('parentRoleId', v, { shouldValidate: true })}
                            options={parentRoleSelectOptions}
                            placeholder="Select master role"
                            searchPlaceholder="Search roles…"
                            noOptionsText="No master roles yet"
                            emptyText="No matches"
                            allowClear
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => { setShowCreateMasterRole(true); setShowCreateRole(false); }}
                          className="shrink-0 px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 text-sm font-medium"
                          title="Create master role"
                        >
                          <Shield className="h-4 w-4" /> Role
                        </button>
                      </div>

                      {showCreateMasterRole && (
                        <div className="mt-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                          <p className="text-sm font-medium text-gray-700 mb-2">Create role</p>
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

                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Shift</label>
                      <SearchableSelect
                        value={editForm.watch('shiftType') || 'Day'}
                        onChange={(v) =>
                          editForm.setValue('shiftType', v as 'Day' | 'Night', { shouldValidate: true })
                        }
                        options={shiftSelectOptions}
                        placeholder="Shift"
                        searchPlaceholder="Shift…"
                        showSearch={false}
                        noOptionsText="—"
                        emptyText="—"
                      />
                    </div>
                  </div>
                </section>

                {/* Tab Navigation for extra sections */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5">
                    {(['basic', 'personal', 'financial', 'medical', 'notes'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setEditActiveTab(tab)}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${editActiveTab === tab ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Basic tab = payroll + attendance (existing) */}
                  {editActiveTab === 'basic' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Salary (per cycle)</label>
                        <input type="number" min={0} step={0.01} {...editForm.register('salary', { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="e.g. 15000" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Min hours / day</label>
                        <input type="number" min={0.5} max={24} step={0.5} {...editForm.register('minHoursPerDay', { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="e.g. 8" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Reports to</label>
                        <SearchableSelect
                          value={editForm.watch('reportsToTarget') || ''}
                          onChange={(v) => editForm.setValue('reportsToTarget', v, { shouldValidate: true })}
                          options={reportsToSelectOptions.filter((o) => o.value !== editing._id)}
                          placeholder="Choose owner or staff…"
                          searchPlaceholder="Search by name or role…"
                          allowClear
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Punch-in time</label>
                        <Controller name="punchInTime" control={editForm.control} render={({ field }) => (
                          <TimePickerField use12Hour value={field.value ?? ''} onChange={field.onChange} />
                        )} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Status</label>
                        <div className="flex gap-2">
                          {(['active', 'on_hold'] as const).map((s) => (
                            <button key={s} type="button"
                              onClick={() => editForm.setValue('userStatus', s)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${
                                editForm.watch('userStatus') === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                              }`}>
                              {s.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                        {editForm.watch('userStatus') === 'on_hold' && (
                          <input {...editForm.register('userStatusReason')} className="mt-2 w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" placeholder="Reason for hold" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Personal tab */}
                  {editActiveTab === 'personal' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Date of Birth</label>
                        <input type="date" {...editForm.register('dateOfBirth')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Gender</label>
                        <select {...editForm.register('gender')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm">
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Secondary Phone</label>
                        <input {...editForm.register('secondaryPhone')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="Optional" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Guardian Phone</label>
                        <input {...editForm.register('guardianPhone')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="Emergency contact" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Department</label>
                        <input {...editForm.register('department')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="e.g. Kitchen, Front of House" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Joining Date</label>
                        <input type="date" {...editForm.register('joiningDate')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Previous Experience</label>
                        <textarea {...editForm.register('previousExperience')} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm" placeholder="Brief work history" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Local Address</label>
                        <textarea {...editForm.register('localAddress')} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm" placeholder="Current local address" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Permanent Address</label>
                        <textarea {...editForm.register('permanentAddress')} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm" placeholder="Permanent / home address" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Location Link</label>
                        <input {...editForm.register('locationLink')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="Google Maps or any link" />
                      </div>
                    </div>
                  )}

                  {/* Financial tab */}
                  {editActiveTab === 'financial' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">UPI ID</label>
                        <input
                          {...editForm.register('upiId')}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                          placeholder="e.g. name@okaxis"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Bank Account Number</label>
                        <input {...editForm.register('bankAccountNumber')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono" placeholder="Account number" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">IFSC Code</label>
                        <input {...editForm.register('ifscCode')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono uppercase" placeholder="e.g. SBIN0001234" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">PAN Number</label>
                        <input {...editForm.register('panNumber')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono uppercase" placeholder="ABCDE1234F" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">PF Number</label>
                        <input {...editForm.register('pfNumber')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono" placeholder="PF account number" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">ESIC Number</label>
                        <input {...editForm.register('esicNumber')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono" placeholder="ESIC number" />
                      </div>
                    </div>
                  )}

                  {/* Medical & Compliance tab */}
                  {editActiveTab === 'medical' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Has Medical Condition</p>
                          <p className="text-xs text-gray-500 mt-0.5">Staff has a known medical condition</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => editForm.setValue('hasMedicalCondition', !editForm.watch('hasMedicalCondition'))}
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                            editForm.watch('hasMedicalCondition') ? 'bg-emerald-600' : 'bg-gray-200'
                          }`}
                        >
                          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            editForm.watch('hasMedicalCondition') ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                      {editForm.watch('hasMedicalCondition') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1.5">Medical Condition Notes</label>
                          <textarea {...editForm.register('medicalConditionNotes')} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm" placeholder="Describe the condition" />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Body Marks / Identification</label>
                        <textarea {...editForm.register('bodyMarks')} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm" placeholder="Tattoos, scars, birthmarks" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Police Verification Status</label>
                        <div className="flex gap-2 flex-wrap">
                          {(['not_required', 'pending', 'verified'] as const).map((s) => (
                            <button key={s} type="button"
                              onClick={() => editForm.setValue('policeVerificationStatus', s)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all border ${
                                editForm.watch('policeVerificationStatus') === s
                                  ? s === 'verified' ? 'bg-emerald-600 text-white border-emerald-600'
                                  : s === 'pending' ? 'bg-amber-500 text-white border-amber-500'
                                  : 'bg-gray-600 text-white border-gray-600'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                              }`}>
                              {s.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Police Verification Notes</label>
                        <textarea {...editForm.register('policeVerificationNotes')} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm" placeholder="Reference number, date, etc." />
                      </div>
                    </div>
                  )}

                  {editActiveTab === 'notes' && editing && (
                    <StaffNotesPanel employeeId={editing._id} />
                  )}
                </div>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up relative">
            <button
              type="button"
              onClick={() => {
                setConfirmRemove(null);
                setIsReassigning(false);
                setReassignToId('');
              }}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <p className="text-lg font-bold text-gray-900">Delete {confirmRemove.name}?</p>
            <p className="text-sm text-gray-500 mt-1">
              This will deactivate their account and remove them from the active roster. They won&apos;t be able to access the app or punch in.
            </p>

            {(() => {
              const subs = (employees as StaffCardRow[]).filter(
                (e) => (typeof e.reportsToEmployeeId === 'string' ? e.reportsToEmployeeId : (e.reportsToEmployeeId as any)?._id) === confirmRemove._id
              );
              if (subs.length === 0) return null;

              return (
                <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-2">
                    <Shield className="h-4 w-4" />
                    Manager detected
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <strong>{confirmRemove.name}</strong> has <strong>{subs.length}</strong> subordinates. Choose a new manager for them before removing.
                  </p>
                  <div className="mt-3">
                    <SearchableSelect
                      value={reassignToId}
                      onChange={setReassignToId}
                      options={reportsToSelectOptions.filter((o) => o.value !== confirmRemove._id)}
                      placeholder="Select new manager..."
                      className="bg-white"
                    />
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  const subs = (employees as StaffCardRow[]).filter(
                    (e) => (typeof e.reportsToEmployeeId === 'string' ? e.reportsToEmployeeId : (e.reportsToEmployeeId as any)?._id) === confirmRemove._id
                  );
                  if (subs.length > 0 && !reassignToId) {
                    return;
                  }
                  deactivateMutation.mutate({ id: confirmRemove._id, newManagerId: reassignToId || undefined });
                }}
                disabled={
                  deactivateMutation.isPending ||
                  ((employees as StaffCardRow[]).some(
                    (e) => (typeof e.reportsToEmployeeId === 'string' ? e.reportsToEmployeeId : (e.reportsToEmployeeId as any)?._id) === confirmRemove._id
                  ) &&
                    !reassignToId)
                }
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm shadow-red-200"
              >
                {deactivateMutation.isPending ? 'Deleting...' : 'Delete staff'}
              </button>
              <button
                onClick={() => {
                  setConfirmRemove(null);
                  setIsReassigning(false);
                  setReassignToId('');
                }}
                disabled={deactivateMutation.isPending}
                className="px-4 py-2.5 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
