import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { startOfDay, format } from 'date-fns';
import { useOutletStore } from '@/stores/outletStore';
import { useAuth } from '@/hooks/useAuth';
import { taskApi } from '@/api/task';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SearchableSelect } from '@/components/SearchableSelect';
import { MultiSearchableSelect } from '@/components/MultiSearchableSelect';
import { TaskScheduleCard } from '@/components/TaskScheduleCard';
import { MyTasksTodayPanel } from '@/components/tasks/MyTasksTodayPanel';
import { TasksViewSwitch, type TasksViewMode } from '@/components/tasks/TasksViewSwitch';
import { ListSearchBar } from '@/components/ListSearchBar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import {
  patchManagerTasksAfterTemplateUpdate,
  patchTaskTemplatesAfterUpdate,
  refetchAllTaskQueries,
  removeTemplateFromManagerTasksCache,
  removeTemplateFromTemplatesCache,
} from '@/lib/taskQuerySync';
import { DuplicateToOutletModal, type DuplicateToOutletTarget } from '@/components/DuplicateToOutletModal';
import { parseHHmm } from '@/utils/taskScheduleUtils';
import {
  CheckSquare,
  Users,
  User,
  ImagePlus,
  ListTodo,
  Pencil,
  Trash2,
  X,
  Plus,
  Copy,
  Square,
  ArrowRightLeft,
} from 'lucide-react';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  parentRoleId: z.string().optional(), // Now optional at schema level
  assignToType: z.enum(['role', 'staff']),
  assignToEmployeeId: z.string().optional(),
  shiftType: z.enum(['Day', 'Night', 'Both']),
  taskType: z.enum(['daily', 'weekly', 'specific-days', 'onetime']),
  specificDate: z.string().optional(),
  specificDays: z.array(z.number()).optional(),
  multipleTimesPerDay: z.boolean().default(false),
  intervalMinutes: z.coerce.number().optional(),
  repeatEndTime: z.string().optional(),
  startTime: z.string().optional(),
  timeLimitMinutes: z.coerce.number().optional(),
  mandatoryProofOfCompletion: z.boolean().default(false),
  checklistItems: z.array(z.object({
    text: z.string().min(1, 'Item text required'),
    referenceMediaUrl: z.string().optional(),
  })).optional(),
}).superRefine((data, ctx) => {
  if (data.taskType === 'onetime' && !data.specificDate?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Date is required for one-time tasks',
      path: ['specificDate'],
    });
  }
  if (!data.multipleTimesPerDay) return;
  const start = parseHHmm(data.startTime);
  const end = parseHHmm(data.repeatEndTime);
  if (start == null || end == null) return;
  if (start >= end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End time must be after start time',
      path: ['repeatEndTime'],
    });
  }
});

type TaskForm = z.infer<typeof taskSchema>;

type TemplateAssignmentSource = {
  assignToType?: 'role' | 'staff';
  isCollaborative?: boolean;
  parentRoleId?: { name?: string } | string | null;
  assignToEmployeeId?: { name?: string; _id?: string } | string | null;
  assignToEmployeeIds?: Array<{ name?: string; _id?: string } | string> | null;
};

function isStaffAssignedTemplate(t: TemplateAssignmentSource): boolean {
  return (
    t.assignToType === 'staff' ||
    Boolean(t.isCollaborative) ||
    Boolean(t.assignToEmployeeId) ||
    (Array.isArray(t.assignToEmployeeIds) && t.assignToEmployeeIds.length > 0)
  );
}

function formatTemplateAssignment(t: TemplateAssignmentSource): string {
  if (!isStaffAssignedTemplate(t)) {
    const roleName =
      typeof t.parentRoleId === 'object' && t.parentRoleId?.name
        ? t.parentRoleId.name
        : '-';
    return roleName;
  }

  const names: string[] = [];
  if (Array.isArray(t.assignToEmployeeIds)) {
    for (const ref of t.assignToEmployeeIds) {
      if (typeof ref === 'object' && ref?.name?.trim()) names.push(ref.name.trim());
    }
  }
  if (!names.length && t.assignToEmployeeId) {
    const ref = t.assignToEmployeeId;
    if (typeof ref === 'object' && ref?.name?.trim()) names.push(ref.name.trim());
  }

  if (t.isCollaborative && names.length > 1) {
    return `Shared · ${names.join(', ')}`;
  }
  if (names.length) return names.join(', ');
  return 'Staff';
}

export function TasksPage() {
  const { selectedOutletId, outlets } = useOutletStore();
  const { role: authRole, featurePermissions } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const todayYmd = format(new Date(), 'yyyy-MM-dd');

  const canViewMyTasks =
    authRole === 'OWNER' ||
    !!featurePermissions?.webTasks ||
    !!featurePermissions?.managerMyTasks ||
    !!featurePermissions?.managerTasksHub;

  const canManageTemplates =
    authRole === 'OWNER' ||
    !!featurePermissions?.webTasks ||
    !!featurePermissions?.managerTaskTemplates ||
    !!featurePermissions?.managerTaskCreate ||
    !!featurePermissions?.managerTaskTemplateCreate;

  const [viewMode, setViewMode] = useState<TasksViewMode>(() => {
    if (typeof window === 'undefined') return canViewMyTasks ? 'my-tasks' : 'all-tasks';
    const stored = sessionStorage.getItem('tasks-view-mode');
    if (stored === 'my-tasks' || stored === 'all-tasks') return stored;
    return 'my-tasks';
  });

  useEffect(() => {
    if (!canViewMyTasks) {
      setViewMode('all-tasks');
      return;
    }
    if (!canManageTemplates) {
      setViewMode('my-tasks');
    }
  }, [canViewMyTasks, canManageTemplates]);

  useEffect(() => {
    if (canViewMyTasks) {
      sessionStorage.setItem('tasks-view-mode', viewMode);
    }
  }, [viewMode, canViewMyTasks]);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<{
    _id: string;
    title?: string;
    description?: string;
    parentRoleId?: { _id?: string; name?: string };
    shiftType?: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ _id: string; title?: string } | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<DuplicateToOutletTarget | null>(null);
  const [batchTransferTargets, setBatchTransferTargets] = useState<DuplicateToOutletTarget[] | null>(
    null
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(() => new Set());
  const [batchConfirmDelete, setBatchConfirmDelete] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [createStaffIds, setCreateStaffIds] = useState<string[]>([]);
  const [createRoleIds, setCreateRoleIds] = useState<string[]>([]);
  const [createIsShared, setCreateIsShared] = useState(false);
  const [editStaffIds, setEditStaffIds] = useState<string[]>([]);
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [editIsShared, setEditIsShared] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const debouncedTemplateSearch = useDebouncedValue(templateSearch, 350);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['task-templates', selectedOutletId, debouncedTemplateSearch],
    queryFn: () =>
      taskApi.getTemplates(selectedOutletId!, {
        limit: 100,
        search: debouncedTemplateSearch.trim() || undefined,
      }),
    enabled: !!selectedOutletId && viewMode === 'all-tasks',
    staleTime: 0,
  });

  const { data: myTasksPreview } = useQuery({
    queryKey: ['manager-tasks', selectedOutletId, todayYmd],
    queryFn: () => taskApi.getManagerTasks(selectedOutletId!, todayYmd),
    enabled: !!selectedOutletId && canViewMyTasks,
  });

  const pendingMyTasksCount =
    myTasksPreview?.tasks.filter((t) => !t.isCompleted).length ?? 0;

  const { data: rolesData } = useQuery({
    queryKey: ['parent-roles'],
    queryFn: () => employeeApi.getParentRoles(),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['my-employees', selectedOutletId],
    queryFn: () => employeeApi.getMyEmployees({ outletId: selectedOutletId!, limit: 200 }),
    enabled: !!selectedOutletId && (showCreate || !!editing),
  });

  const createRoleMutation = useMutation({
    mutationFn: (name: string) => employeeApi.createParentRole(name, selectedOutletId ?? undefined),
    onSuccess: (res) => {
      const newRole = res?.data?.parentRole;
      if (newRole) {
        queryClient.invalidateQueries({ queryKey: ['parent-roles'] });
        queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
        const id = String(newRole._id);
        setCreateRoleIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        form.setValue('parentRoleId', id);
        setShowCreateRole(false);
        setNewRoleName('');
      }
    },
  });

  const refreshTaskQueries = async () => {
    if (!selectedOutletId) return;
    await refetchAllTaskQueries(queryClient, selectedOutletId, todayYmd);
  };

  const createMutation = useMutation({
    mutationFn: async (input: {
      payload: Parameters<typeof taskApi.createTemplate>[0];
      duplicateStaffIds?: string[];
      duplicateRoleIds?: string[];
    }) => {
      if (input.duplicateStaffIds?.length) {
        for (const assignToEmployeeId of input.duplicateStaffIds) {
          await taskApi.createTemplate({ ...input.payload, assignToEmployeeId, assignToType: 'staff' });
        }
        return;
      }
      if (input.duplicateRoleIds?.length) {
        for (const parentRoleId of input.duplicateRoleIds) {
          await taskApi.createTemplate({
            ...input.payload,
            parentRoleId,
            assignToRoleId: parentRoleId,
            assignToType: 'role',
          });
        }
        return;
      }
      return taskApi.createTemplate(input.payload);
    },
    onSuccess: async () => {
      await refreshTaskQueries();
      setShowCreate(false);
      form.reset(defaultFormValues);
      setCreateStaffIds([]);
      setCreateRoleIds([]);
      setCreateIsShared(false);
      setImageUrl('');
      setImageFile(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TaskForm }) => {
      const assignToType = data.assignToType ?? 'role';
      const payload: any = {
        ...data,
        imageUrl: imageUrl || undefined,
        hourlyFrequency:
          data.multipleTimesPerDay && data.intervalMinutes
            ? Math.max(1, Math.floor(60 / (Number(data.intervalMinutes) || 60)))
            : 1,
        intervalMinutes: data.multipleTimesPerDay && data.intervalMinutes ? Number(data.intervalMinutes) : undefined,
        repeatEndTime: data.multipleTimesPerDay && data.repeatEndTime ? data.repeatEndTime : undefined,
        assignToRoleId: assignToType === 'role' ? (editRoleIds[0] || data.parentRoleId) : undefined,
        assignToEmployeeId: assignToType === 'staff' ? editStaffIds[0] : undefined,
        parentRoleId: assignToType === 'role' ? (editRoleIds[0] || data.parentRoleId) : undefined,
        timeLimitMinutes: data.timeLimitMinutes ? Number(data.timeLimitMinutes) : undefined,
        mandatoryProofOfCompletion: Boolean(data.mandatoryProofOfCompletion),
        checklistItems: data.checklistItems?.map((item, idx) => ({
          ...item,
          order: idx,
        })),
      };
      if (assignToType === 'staff' && editIsShared && editStaffIds.length > 1) {
        payload.assignToEmployeeIds = editStaffIds;
        payload.isCollaborative = true;
      } else if (assignToType === 'staff') {
        payload.isCollaborative = false;
      } else if (assignToType === 'role' && editIsShared) {
        payload.isCollaborative = true;
        payload.collaboratorRoleIds = editRoleIds;
      } else if (assignToType === 'role') {
        payload.isCollaborative = false;
      }
      await taskApi.updateTemplate(id, payload);
      if (assignToType === 'staff' && !editIsShared && editStaffIds.length > 1) {
        for (const staffId of editStaffIds.slice(1)) {
          await taskApi.createTemplate({
            title: data.title,
            description: data.description || undefined,
            outletId: selectedOutletId!,
            shiftType: data.shiftType ?? 'Both',
            taskType: data.taskType as any,
            specificDate: data.taskType === 'onetime' && data.specificDate ? data.specificDate : undefined,
            specificDays: data.taskType === 'specific-days' && data.specificDays?.length ? data.specificDays : undefined,
            imageUrl: imageUrl || undefined,
            hourlyFrequency: payload.hourlyFrequency,
            intervalMinutes: payload.intervalMinutes,
            repeatEndTime: payload.repeatEndTime,
            assignToType: 'staff',
            assignToEmployeeId: staffId,
            startTime: data.startTime || undefined,
            timeLimitMinutes: data.timeLimitMinutes ? Number(data.timeLimitMinutes) : undefined,
            checklistItems: payload.checklistItems,
          });
        }
      }
      if (assignToType === 'role' && editRoleIds.length > 1 && !editIsShared) {
        for (const parentRoleId of editRoleIds.slice(1)) {
          await taskApi.createTemplate({
            title: data.title,
            description: data.description || undefined,
            outletId: selectedOutletId!,
            shiftType: data.shiftType ?? 'Both',
            taskType: data.taskType as any,
            specificDate: data.taskType === 'onetime' && data.specificDate ? data.specificDate : undefined,
            specificDays: data.taskType === 'specific-days' && data.specificDays?.length ? data.specificDays : undefined,
            imageUrl: imageUrl || undefined,
            hourlyFrequency: payload.hourlyFrequency,
            intervalMinutes: payload.intervalMinutes,
            repeatEndTime: payload.repeatEndTime,
            assignToType: 'role',
            parentRoleId,
            assignToRoleId: parentRoleId,
            startTime: data.startTime || undefined,
            timeLimitMinutes: data.timeLimitMinutes ? Number(data.timeLimitMinutes) : undefined,
            checklistItems: payload.checklistItems,
          });
        }
      }
    },
    onSuccess: async (_data, variables) => {
      const updates = {
        title: variables.data.title,
        description: variables.data.description ?? '',
        shiftType: variables.data.shiftType,
      };
      patchTaskTemplatesAfterUpdate(queryClient, variables.id, updates);
      patchManagerTasksAfterTemplateUpdate(queryClient, variables.id, {
        title: updates.title,
        description: updates.description,
        startTime: variables.data.startTime || null,
        timeLimitMinutes: variables.data.timeLimitMinutes
          ? Number(variables.data.timeLimitMinutes)
          : null,
      });
      setEditing(null);
      editForm.reset();
      setEditStaffIds([]);
      setEditRoleIds([]);
      setEditIsShared(false);
      setImageUrl('');
      setImageFile(null);
      void refreshTaskQueries();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taskApi.deleteTemplate(id),
    onSuccess: async (_data, id) => {
      removeTemplateFromTemplatesCache(queryClient, id);
      removeTemplateFromManagerTasksCache(queryClient, id);
      setConfirmDelete(null);
      void refreshTaskQueries();
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await taskApi.deleteTemplate(id);
      }
    },
    onSuccess: async (_data, ids) => {
      for (const id of ids) {
        removeTemplateFromTemplatesCache(queryClient, id);
        removeTemplateFromManagerTasksCache(queryClient, id);
      }
      setSelectedTemplateIds(new Set());
      setSelectionMode(false);
      setBatchConfirmDelete(false);
      void refreshTaskQueries();
    },
  });

  const clearTemplateSelection = () => setSelectedTemplateIds(new Set());

  const exitSelectionMode = () => {
    setSelectionMode(false);
    clearTemplateSelection();
  };

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    exitSelectionMode();
    setBatchTransferTargets(null);
    setDuplicateTarget(null);
  }, [selectedOutletId]);

  const defaultFormValues: TaskForm = {
    title: '',
    description: '',
    parentRoleId: '',
    shiftType: 'Both',
    taskType: 'daily',
    specificDate: '',
    specificDays: [],
    multipleTimesPerDay: false,
    intervalMinutes: 60,
    repeatEndTime: '20:00',
    startTime: '09:00',
    timeLimitMinutes: undefined,
    mandatoryProofOfCompletion: false,
    assignToType: 'role',
    assignToEmployeeId: '',
    checklistItems: [],
  };

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: defaultFormValues,
  });

  const editForm = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: defaultFormValues,
  });

  const { fields: checklistFields, append: appendChecklistItem, remove: removeChecklistItem } = useFieldArray({
    control: form.control,
    name: 'checklistItems',
  });

  const { fields: editChecklistFields, append: appendEditChecklistItem, remove: removeEditChecklistItem } = useFieldArray({
    control: editForm.control,
    name: 'checklistItems',
  });

  const [checklistImageLoading, setChecklistImageLoading] = useState<Record<number, boolean>>({});

  const templates = data?.data?.templates ?? [];

  const selectAllTemplates = () => {
    setSelectedTemplateIds(new Set(templates.map((t: { _id: string }) => t._id)));
  };

  const openBatchTransfer = () => {
    const targets = templates
      .filter((t: { _id: string }) => selectedTemplateIds.has(t._id))
      .map((t: { _id: string; title?: string }) => ({
        kind: 'task' as const,
        id: t._id,
        title: t.title ?? 'Untitled',
        sourceOutletId: selectedOutletId!,
      }));
    setBatchTransferTargets(targets);
  };

  const selectedCount = selectedTemplateIds.size;
  const parentRoles = rolesData?.data?.parentRoles ?? [];
  const roleOptions = useMemo(
    () =>
      (parentRoles as { _id: string; name: string }[]).map((r) => ({
        value: r._id,
        label: r.name,
      })),
    [parentRoles]
  );
  const employees = (employeesData as { data?: { employees?: unknown[] } })?.data?.employees ?? [];
  const assigneeEmployeeOptions = useMemo(
    () =>
      (employees as { _id: string; name: string; activeRoleId?: { name?: string; parentRoleId?: { name?: string } } }[]).map(
        (emp) => ({
          value: emp._id,
          label: `${emp.activeRoleId?.parentRoleId?.name || 'Staff'} — ${emp.name}`,
        })
      ),
    [employees]
  );


  const minOneTimeTaskDate = useMemo(() => startOfDay(new Date()), []);

  // Voice navigation: open create modal with prefilled data
  useEffect(() => {
    const state = location.state as { openCreate?: boolean; prefilledTask?: Record<string, unknown> } | null;
    if (state?.openCreate && state?.prefilledTask) {
      setShowCreate(true);
      const t = state.prefilledTask;
      if (t.title) form.setValue('title', String(t.title));
      if (t.description) form.setValue('description', String(t.description));
      if (t.taskType) form.setValue('taskType', t.taskType as 'daily' | 'onetime' | 'specific-days' | 'weekly');
      if (t.specificDate) form.setValue('specificDate', String(t.specificDate));
      if (Array.isArray(t.specificDays)) form.setValue('specificDays', t.specificDays);
      if (typeof t.multipleTimesPerDay === 'boolean') form.setValue('multipleTimesPerDay', t.multipleTimesPerDay);
      if (t.intervalMinutes != null) form.setValue('intervalMinutes', Number(t.intervalMinutes));
      if (t.shiftType) form.setValue('shiftType', t.shiftType as 'Day' | 'Night' | 'Both');
      if (t.assignToType) form.setValue('assignToType', t.assignToType as 'role' | 'staff');
      if (t.parentRoleId) form.setValue('parentRoleId', String(t.parentRoleId));
      if (t.assignToEmployeeId) form.setValue('assignToEmployeeId', String(t.assignToEmployeeId));
      if (t.startTime) form.setValue('startTime', String(t.startTime));
      if (t.timeLimitMinutes != null) form.setValue('timeLimitMinutes', Number(t.timeLimitMinutes));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, selectedOutletId]);

  const resolveEmployeeId = (raw: unknown) => {
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object' && raw !== null && '_id' in raw) return String((raw as { _id: string })._id);
    return String(raw);
  };

  const openEdit = (t: any) => {
    setEditing(t);
    setImageUrl(t.imageUrl || '');
    setImageFile(null);
    const collaborativeIds = Array.isArray(t.assignToEmployeeIds)
      ? t.assignToEmployeeIds.map((id: { _id?: string } | string) => resolveEmployeeId(id))
      : [];
    const staffIds =
      collaborativeIds.length > 0
        ? collaborativeIds
        : t.assignToEmployeeId
          ? [resolveEmployeeId(t.assignToEmployeeId)]
          : [];
    setEditStaffIds(staffIds);
    setEditIsShared(Boolean(t.isCollaborative && staffIds.length > 1));
    const roleId = (t.parentRoleId as { _id?: string })?._id ?? t.parentRoleId ?? '';
    setEditRoleIds(roleId ? [String(roleId)] : []);
    
    editForm.reset({
      title: t.title ?? '',
      description: t.description ?? '',
      assignToType: isStaffAssignedTemplate(t) ? 'staff' : 'role',
      parentRoleId: (t.parentRoleId as { _id?: string })?._id ?? t.parentRoleId ?? '',
      assignToEmployeeId: resolveEmployeeId(t.assignToEmployeeId),
      shiftType: (t.shiftType as 'Day' | 'Night' | 'Both') ?? 'Both',
      taskType: (t.taskType as 'daily' | 'onetime' | 'specific-days' | 'weekly') ?? 'daily',
      specificDate: t.specificDate ?? '',
      specificDays: t.specificDays ?? [],
      multipleTimesPerDay: Boolean(t.intervalMinutes && Number(t.intervalMinutes) > 0) || (t.hourlyFrequency ? t.hourlyFrequency > 1 : false),
      intervalMinutes: t.intervalMinutes ?? (t.hourlyFrequency ? Math.max(5, Math.floor(60 / t.hourlyFrequency)) : 60),
      repeatEndTime: t.repeatEndTime || '20:00',
      startTime: t.startTime || '06:00',
      timeLimitMinutes: t.timeLimitMinutes != null ? Number(t.timeLimitMinutes) : undefined,
      mandatoryProofOfCompletion: Boolean((t as { mandatoryProofOfCompletion?: boolean }).mandatoryProofOfCompletion),
      checklistItems: t.checklistItems ?? [],
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploadingImage(true);
    setImageFile(file);
    try {
      const { url } = await taskApi.uploadTaskImage(file);
      setImageUrl(url);
    } catch {
      setImageFile(null);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleCreateSubmit = form.handleSubmit((d) => {
    const outletId = selectedOutletId || outlets[0]?._id;
    if (!outletId) return;
    const assignToType = d.assignToType ?? 'role';
    const basePayload = {
      title: d.title,
      description: d.description || undefined,
      outletId,
      shiftType: d.shiftType ?? 'Both',
      taskType: (d.taskType as any) ?? 'daily',
      specificDate: d.taskType === 'onetime' && d.specificDate ? d.specificDate : undefined,
      specificDays: d.taskType === 'specific-days' && d.specificDays?.length ? d.specificDays : undefined,
      imageUrl: imageUrl || undefined,
      hourlyFrequency:
        d.multipleTimesPerDay && d.intervalMinutes
          ? Math.max(1, Math.floor(60 / (Number(d.intervalMinutes) || 60)))
          : 1,
      intervalMinutes: d.multipleTimesPerDay && d.intervalMinutes ? Number(d.intervalMinutes) : undefined,
      repeatEndTime: d.multipleTimesPerDay && d.repeatEndTime ? d.repeatEndTime : undefined,
      assignToType,
      assignToRoleId: assignToType === 'role' ? d.parentRoleId : undefined,
      parentRoleId: assignToType === 'role' ? d.parentRoleId : undefined,
      startTime: d.startTime || undefined,
      timeLimitMinutes: d.timeLimitMinutes ? Number(d.timeLimitMinutes) : undefined,
      mandatoryProofOfCompletion: Boolean(d.mandatoryProofOfCompletion),
      checklistItems: d.checklistItems?.map((item, idx) => ({
        ...item,
        order: idx,
      })),
    };

    if (assignToType === 'staff') {
      if (createStaffIds.length === 0) {
        form.setError('assignToEmployeeId', {
          type: 'manual',
          message: 'Select at least one staff member',
        });
        return;
      }
      form.clearErrors('assignToEmployeeId');
      if (createIsShared && createStaffIds.length > 1) {
        createMutation.mutate({
          payload: {
            ...basePayload,
            assignToEmployeeIds: createStaffIds,
            assignToEmployeeId: createStaffIds[0],
            isCollaborative: true,
          },
        });
        return;
      }
      if (createStaffIds.length > 1) {
        createMutation.mutate({
          payload: basePayload,
          duplicateStaffIds: createStaffIds,
        });
        return;
      }
      createMutation.mutate({
        payload: { ...basePayload, assignToEmployeeId: createStaffIds[0] },
      });
      return;
    }

    if (createRoleIds.length === 0) {
      form.setError('parentRoleId', {
        type: 'manual',
        message: 'Select at least one role',
      });
      return;
    }
    form.clearErrors('parentRoleId');
    form.setValue('parentRoleId', createRoleIds[0]);
    if (createIsShared) {
      createMutation.mutate({
        payload: {
          ...basePayload,
          assignToType: 'role',
          parentRoleId: createRoleIds[0],
          assignToRoleId: createRoleIds[0],
          isCollaborative: true,
          collaboratorRoleIds: createRoleIds,
        },
      });
      return;
    }
    if (createRoleIds.length > 1) {
      createMutation.mutate({
        payload: { ...basePayload, assignToType: 'role', parentRoleId: createRoleIds[0], assignToRoleId: createRoleIds[0] },
        duplicateRoleIds: createRoleIds,
      });
      return;
    }
    createMutation.mutate({
      payload: { ...basePayload, parentRoleId: createRoleIds[0], assignToRoleId: createRoleIds[0] },
    });
  });

  if (!selectedOutletId && outlets.length === 0) {
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
      <div className="flex flex-col gap-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {viewMode === 'my-tasks' && canViewMyTasks ? 'My tasks today' : 'Task templates'}
            </h1>
            <p className="text-gray-500 mt-0.5">
              {viewMode === 'my-tasks' && canViewMyTasks
                ? "Today's owner-role checklist — complete tasks as you go"
                : 'Define and manage recurring tasks for your staff'}
            </p>
          </div>
          {canManageTemplates && viewMode === 'all-tasks' && (
            <div className="flex flex-wrap items-center gap-2 w-fit shrink-0">
              {selectionMode ? (
                <>
                  <button
                    type="button"
                    onClick={selectAllTemplates}
                    disabled={templates.length === 0}
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
                onClick={() => {
                  form.reset({ ...defaultFormValues });
                  setCreateStaffIds([]);
                  setCreateIsShared(false);
                  setVoiceError(null);
                  setShowCreate(true);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-emerald flex items-center gap-2"
              >
                <ListTodo className="h-5 w-5" /> Create task
              </button>
            </div>
          )}
        </div>

        {canViewMyTasks && canManageTemplates && (
          <TasksViewSwitch
            value={viewMode}
            onChange={setViewMode}
            myTasksCount={pendingMyTasksCount}
          />
        )}
      </div>

      <div key={viewMode} className="tasks-view-panel">
        {viewMode === 'my-tasks' && canViewMyTasks && selectedOutletId ? (
          <MyTasksTodayPanel outletId={selectedOutletId} todayYmd={todayYmd} />
        ) : (
          <>
            <ListSearchBar
              value={templateSearch}
              onChange={setTemplateSearch}
              placeholder="Search templates by title or description"
              className="max-w-xl mb-6"
              id="tasks-search"
              aria-label="Search task templates"
            />

            {isLoading ? (
              <LoadingSpinner className="py-16" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in-stagger">
                {templates.map((t: { _id: string; title?: string; description?: string; parentRoleId?: { name: string }; shiftType?: string; assignToType?: 'role' | 'staff'; isCollaborative?: boolean; assignToEmployeeId?: { name?: string } | string; assignToEmployeeIds?: Array<{ name?: string } | string> }) => {
                  const isSelected = selectedTemplateIds.has(t._id);
                  return (
                  <div
                    key={t._id}
                    role={selectionMode ? 'button' : undefined}
                    tabIndex={selectionMode ? 0 : undefined}
                    onClick={selectionMode ? () => toggleTemplateSelection(t._id) : undefined}
                    onKeyDown={
                      selectionMode
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleTemplateSelection(t._id);
                            }
                          }
                        : undefined
                    }
                    className={`group rounded-2xl border p-5 card-hover bg-white overflow-hidden shadow-sm transition-colors ${
                      selectionMode
                        ? isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-200 cursor-pointer'
                          : 'border-emerald-100 cursor-pointer hover:border-emerald-300'
                        : 'border-emerald-100'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      {selectionMode ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTemplateSelection(t._id);
                          }}
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 hover:bg-emerald-50"
                          aria-label={isSelected ? 'Deselect task' : 'Select task'}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-7 w-7" />
                          ) : (
                            <Square className="h-7 w-7 text-gray-300" />
                          )}
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <CheckSquare className="h-6 w-6 text-emerald-600" />
                        </div>
                      )}
                      {canManageTemplates && !selectionMode && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              setDuplicateTarget({
                                kind: 'task',
                                id: t._id,
                                title: t.title ?? 'Untitled',
                                sourceOutletId: selectedOutletId!,
                              })
                            }
                            className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Duplicate to outlet"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setConfirmDelete({ _id: t._id, title: t.title })} className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{t.title ?? 'Untitled'}</p>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{t.description || 'No description'}</p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700">
                        {formatTemplateAssignment(t)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600">{t.shiftType ?? 'Both'}</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {templates.length === 0 && !isLoading && (
              <div className="text-center py-16 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckSquare className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="text-gray-500">
                  {debouncedTemplateSearch.trim() ? 'No templates match your search.' : 'No task templates yet'}
                </p>
                {canManageTemplates && !debouncedTemplateSearch.trim() && (
                  <button onClick={() => setShowCreate(true)} className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium">
                    Create your first task
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
          <div className="relative flex max-h-[96vh] sm:max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl animate-slide-up">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Create task</h2>
                <p className="text-sm text-gray-500 mt-0.5">Templates your staff complete each shift</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-6">
              {createMutation.isError && (
                <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{getApiErrorMessage(createMutation.error)}</p>
              )}
              {Object.keys(form.formState.errors).length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-700 text-sm border border-amber-100">
                  <p className="font-semibold mb-1 text-amber-800">Please fix the following:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    {Object.entries(form.formState.errors).map(([field, err]) => (
                      <li key={field}><span className="capitalize">{field}</span>: {(err as any)?.message ?? 'Invalid value'}</li>
                    ))}
                  </ul>
                </div>
              )}
              <form 
                onSubmit={(e) => {
                  console.log('[TasksPage] Submit attempt');
                  handleCreateSubmit(e);
                }} 
                className="space-y-5"
              >
                {/* Basic info */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-semibold text-gray-900">Details</h3>
                    <VoiceInputButton
                      onResult={async (blob) => {
                        const outletId = selectedOutletId || outlets[0]?._id;
                        if (!outletId) {
                          setVoiceError('Select an outlet first');
                          return;
                        }
                        setVoiceError(null);
                        setVoiceProcessing(true);
                        try {
                          const { task } = await taskApi.voiceToTask(blob, outletId);
                          if (typeof task.title === 'string') form.setValue('title', task.title);
                          if (typeof task.description === 'string') form.setValue('description', task.description);
                          if (task.taskType) form.setValue('taskType', task.taskType as 'daily' | 'onetime' | 'specific-days' | 'weekly');
                          if (task.specificDate) form.setValue('specificDate', task.specificDate as string);
                          if (Array.isArray(task.specificDays)) form.setValue('specificDays', task.specificDays);
                          if (typeof task.multipleTimesPerDay === 'boolean') form.setValue('multipleTimesPerDay', task.multipleTimesPerDay);
                          if (task.intervalMinutes != null) form.setValue('intervalMinutes', Number(task.intervalMinutes));
                          if (task.shiftType) form.setValue('shiftType', task.shiftType as 'Day' | 'Night' | 'Both');
                          if (task.assignToType) form.setValue('assignToType', task.assignToType as 'role' | 'staff');
                          const pr = task.parentRoleId;
                          if (typeof pr === 'string') form.setValue('parentRoleId', pr);
                          const ae = task.assignToEmployeeId;
                          if (typeof ae === 'string') form.setValue('assignToEmployeeId', ae);
                          if (task.startTime) form.setValue('startTime', task.startTime as string);
                          if (task.repeatEndTime) form.setValue('repeatEndTime', task.repeatEndTime as string);
                          if (task.timeLimitMinutes != null) form.setValue('timeLimitMinutes', Number(task.timeLimitMinutes));
                        } catch (err) {
                          setVoiceError(getApiErrorMessage(err as Error) || 'Voice processing failed');
                        } finally {
                          setVoiceProcessing(false);
                        }
                      }}
                      onError={setVoiceError}
                      disabled={voiceProcessing}
                      processing={voiceProcessing}
                    />
                  </div>
                  {voiceError && <p className="text-red-600 text-sm">{voiceError}</p>}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                    <input {...form.register('title')} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="e.g. Cut vegetables" />
                    {form.formState.errors.title && <p className="text-red-600 text-sm mt-1">{form.formState.errors.title.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
                    <textarea {...form.register('description')} rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="Task details..." />
                  </div>
                </section>

                <TaskScheduleCard
                  form={form}
                  control={form.control}
                  minOneTimeDate={minOneTimeTaskDate}
                />

                {/* Assignment */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-4 w-4" /> Assign to
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => form.setValue('assignToType', 'role')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${form.watch('assignToType') === 'role' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      <Users className="h-4 w-4" /> Role
                    </button>
                    <button
                      type="button"
                      onClick={() => form.setValue('assignToType', 'staff')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${form.watch('assignToType') === 'staff' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      <User className="h-4 w-4" /> Staff
                    </button>
                  </div>
                  {form.watch('assignToType') === 'role' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Roles <span className="font-normal text-gray-400">(select one or more)</span>
                      </label>
                      <MultiSearchableSelect
                        values={createRoleIds}
                        onChange={(ids) => {
                          setCreateRoleIds(ids);
                          form.setValue('parentRoleId', ids[0] || '');
                          if (ids.length > 0) form.clearErrors('parentRoleId');
                        }}
                        options={roleOptions}
                        placeholder="Search & select roles…"
                      />
                      {createRoleIds.length > 1 && !createIsShared && (
                        <p className="mt-2 text-xs text-gray-500">
                          Creates a separate task copy for each selected role.
                        </p>
                      )}
                      {createRoleIds.length > 0 ? (
                        <label className="mt-3 flex items-start gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={createIsShared}
                            onChange={(e) => setCreateIsShared(e.target.checked)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium">Shared task</span>
                            <span className="block text-gray-500 text-xs mt-0.5">
                              One checklist for the team — anyone in the selected role(s) can complete it.
                            </span>
                          </span>
                        </label>
                      ) : null}
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setShowCreateRole(true)}
                          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          + Create new role
                        </button>
                      </div>
                      {form.formState.errors.parentRoleId && (
                        <p className="text-red-600 text-sm mt-1">{form.formState.errors.parentRoleId.message}</p>
                      )}
                    </div>
                  )}
                  {form.watch('assignToType') === 'staff' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Staff members <span className="font-normal text-gray-400">(select one or more)</span>
                      </label>
                      <MultiSearchableSelect
                        values={createStaffIds}
                        onChange={(ids) => {
                          setCreateStaffIds(ids);
                          form.setValue('assignToEmployeeId', ids[0] || '', { shouldValidate: true });
                          if (ids.length > 0) form.clearErrors('assignToEmployeeId');
                        }}
                        options={assigneeEmployeeOptions}
                        placeholder="Search & select staff…"
                      />
                      {createStaffIds.length > 1 ? (
                        <label className="mt-3 flex items-start gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={createIsShared}
                            onChange={(e) => setCreateIsShared(e.target.checked)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium">Shared task</span>
                            <span className="block text-gray-500 text-xs mt-0.5">
                              One checklist for all selected staff. Uncheck to create separate copies.
                            </span>
                          </span>
                        </label>
                      ) : null}
                      {form.formState.errors.assignToEmployeeId && (
                        <p className="text-red-600 text-sm mt-1">
                          {form.formState.errors.assignToEmployeeId.message}
                        </p>
                      )}
                    </div>
                  )}
                </section>

                {/* Checklist Builder */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <ListTodo className="h-4 w-4" /> Checklist items
                    </h3>
                    <button
                      type="button"
                      onClick={() => appendChecklistItem({ text: '' })}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add item
                    </button>
                  </div>
                  <div className="space-y-3">
                    {checklistFields.map((field, index) => (
                      <div key={field.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3 animate-slide-up">
                        <div className="flex items-start gap-3">
                          <span className="mt-2.5 w-6 h-6 flex-shrink-0 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <textarea
                            {...form.register(`checklistItems.${index}.text` as const)}
                            placeholder="What needs to be done?"
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                            rows={1}
                          />
                          <button
                            type="button"
                            onClick={() => removeChecklistItem(index)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="pl-9 flex items-center gap-4">
                          <div className="relative group">
                            <input
                              type="file"
                              id={`checklist-img-${index}`}
                              className="hidden"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setChecklistImageLoading(prev => ({ ...prev, [index]: true }));
                                try {
                                  const { url } = await taskApi.uploadTaskImage(file);
                                  form.setValue(`checklistItems.${index}.referenceMediaUrl`, url);
                                } finally {
                                  setChecklistImageLoading(prev => ({ ...prev, [index]: false }));
                                }
                              }}
                            />
                            <label
                              htmlFor={`checklist-img-${index}`}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-emerald-400 hover:text-emerald-600 cursor-pointer transition-all"
                            >
                              {checklistImageLoading[index] ? (
                                <LoadingSpinner className="h-3 w-3" />
                              ) : form.watch(`checklistItems.${index}.referenceMediaUrl`) ? (
                                <>
                                  <ImagePlus className="h-3.5 w-3.5 text-emerald-500" />
                                  Change image
                                </>
                              ) : (
                                <>
                                  <ImagePlus className="h-3.5 w-3.5" />
                                  Add image
                                </>
                              )}
                            </label>
                          </div>
                          {form.watch(`checklistItems.${index}.referenceMediaUrl`) && (
                            <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-gray-200 group">
                              <img src={form.watch(`checklistItems.${index}.referenceMediaUrl`)} className="h-full w-full object-cover" alt="" />
                              <button
                                type="button"
                                onClick={() => form.setValue(`checklistItems.${index}.referenceMediaUrl`, '')}
                                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {checklistFields.length === 0 && (
                      <p className="text-center py-4 text-sm text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                        No checklist items added yet.
                      </p>
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/60 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      {...form.register('mandatoryProofOfCompletion')}
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">Mandatory proof of completion</span>
                      <span className="block text-xs text-gray-600 mt-0.5">
                        Staff must upload a photo to complete, or explain why they could not. Checklist items also need proof or a reason.
                      </span>
                    </span>
                  </label>
                </section>

                {/* Photo */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <ImagePlus className="h-4 w-4" /> Photo (optional)
                  </h3>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  {imageUrl || imageFile ? (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="h-32 bg-gray-100 flex items-center justify-center">
                        {imageUrl ? <img src={imageUrl} alt="Task" className="max-h-full max-w-full object-contain" /> : <span className="text-gray-400">Uploading...</span>}
                      </div>
                      <div className="flex gap-2 p-3">
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="flex-1 py-2 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-medium">
                          {uploadingImage ? 'Uploading...' : 'Change'}
                        </button>
                        <button type="button" onClick={() => { setImageUrl(''); setImageFile(null); }} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium">
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors flex flex-col items-center gap-2"
                    >
                      <ImagePlus className="h-10 w-10 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">{uploadingImage ? 'Uploading...' : 'Add photo'}</span>
                    </button>
                  )}
                </section>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button type="submit" disabled={createMutation.isPending} className="flex-1 px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all">
                    {createMutation.isPending ? 'Creating...' : 'Create task'}
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create role modal */}
      {showCreateRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-up relative">
            <button type="button" onClick={() => setShowCreateRole(false)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-8">Create role</h3>
            <p className="text-sm text-gray-500 mb-4">Add a new role type (e.g. CHEF-3, CASHIER)</p>
            <input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Role name"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCreateRole(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium">Cancel</button>
              <button onClick={() => createRoleMutation.mutate(newRoleName.trim())} disabled={!newRoleName.trim() || createRoleMutation.isPending} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50">
                {createRoleMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
          <div className="relative flex max-h-[96vh] sm:max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl animate-slide-up">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit task</h2>
                <p className="text-sm text-gray-500 mt-0.5 truncate max-w-[280px] sm:max-w-md">{editing.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-6">
              {updateMutation.isError && (
                <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{getApiErrorMessage(updateMutation.error)}</p>
              )}
              {Object.keys(editForm.formState.errors).length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-700 text-sm border border-amber-100">
                  <p className="font-semibold mb-1 text-amber-800">Please fix the following:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    {Object.entries(editForm.formState.errors).map(([field, err]) => (
                      <li key={field}><span className="capitalize">{field}</span>: {(err as any)?.message ?? 'Invalid value'}</li>
                    ))}
                  </ul>
                </div>
              )}
              <form
                onSubmit={editForm.handleSubmit((d) => {
                  if (d.assignToType === 'staff' && editStaffIds.length === 0) {
                    editForm.setError('assignToEmployeeId', {
                      type: 'manual',
                      message: 'Select at least one staff member',
                    });
                    return;
                  }
                  if (d.assignToType === 'role' && editRoleIds.length === 0) {
                    editForm.setError('parentRoleId', {
                      type: 'manual',
                      message: 'Select at least one role',
                    });
                    return;
                  }
                  editForm.clearErrors('assignToEmployeeId');
                  editForm.clearErrors('parentRoleId');
                  editForm.setValue('parentRoleId', editRoleIds[0] || '');
                  updateMutation.mutate({ id: editing._id, data: d });
                })}
                className="space-y-5"
              >
                {/* Basic info */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                    <input {...editForm.register('title')} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="e.g. Cut vegetables" />
                    {editForm.formState.errors.title && <p className="text-red-600 text-sm mt-1">{editForm.formState.errors.title.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
                    <textarea {...editForm.register('description')} rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="Task details..." />
                  </div>
                </section>

                <TaskScheduleCard
                  form={editForm}
                  control={editForm.control}
                  minOneTimeDate={minOneTimeTaskDate}
                />

                {/* Assignment */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-4 w-4" /> Assign to
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editForm.setValue('assignToType', 'role')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${editForm.watch('assignToType') === 'role' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      <Users className="h-4 w-4" /> Role
                    </button>
                    <button
                      type="button"
                      onClick={() => editForm.setValue('assignToType', 'staff')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${editForm.watch('assignToType') === 'staff' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      <User className="h-4 w-4" /> Staff
                    </button>
                  </div>
                  {editForm.watch('assignToType') === 'role' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Roles <span className="font-normal text-gray-400">(select one or more)</span>
                      </label>
                      <MultiSearchableSelect
                        values={editRoleIds}
                        onChange={(ids) => {
                          setEditRoleIds(ids);
                          editForm.setValue('parentRoleId', ids[0] || '');
                          if (ids.length > 0) editForm.clearErrors('parentRoleId');
                        }}
                        options={roleOptions}
                        placeholder="Search & select roles…"
                      />
                      {editRoleIds.length > 1 && !editIsShared && (
                        <p className="mt-2 text-xs text-gray-500">
                          Updates this task for the first role; creates copies for additional roles.
                        </p>
                      )}
                      {editRoleIds.length > 0 ? (
                        <label className="mt-3 flex items-start gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={editIsShared}
                            onChange={(e) => setEditIsShared(e.target.checked)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium">Shared task</span>
                            <span className="block text-gray-500 text-xs mt-0.5">
                              One checklist for the team — anyone in the selected role(s) can complete it.
                            </span>
                          </span>
                        </label>
                      ) : null}
                      {editForm.formState.errors.parentRoleId && (
                        <p className="text-red-600 text-sm mt-1">{editForm.formState.errors.parentRoleId.message}</p>
                      )}
                    </div>
                  )}
                  {editForm.watch('assignToType') === 'staff' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Staff members <span className="font-normal text-gray-400">(select one or more)</span>
                      </label>
                      <MultiSearchableSelect
                        values={editStaffIds}
                        onChange={(ids) => {
                          setEditStaffIds(ids);
                          editForm.setValue('assignToEmployeeId', ids[0] || '', { shouldValidate: true });
                          if (ids.length > 0) editForm.clearErrors('assignToEmployeeId');
                        }}
                        options={assigneeEmployeeOptions}
                        placeholder="Search & select staff…"
                      />
                      {editStaffIds.length > 1 ? (
                        <label className="mt-3 flex items-start gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={editIsShared}
                            onChange={(e) => setEditIsShared(e.target.checked)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium">Shared task</span>
                            <span className="block text-gray-500 text-xs mt-0.5">
                              One checklist for all selected staff. Uncheck to create separate copies.
                            </span>
                          </span>
                        </label>
                      ) : null}
                      {editForm.formState.errors.assignToEmployeeId && (
                        <p className="text-red-600 text-sm mt-1">
                          {editForm.formState.errors.assignToEmployeeId.message}
                        </p>
                      )}
                    </div>
                  )}
                </section>

                {/* Checklist Builder */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <ListTodo className="h-4 w-4" /> Checklist items
                    </h3>
                    <button
                      type="button"
                      onClick={() => appendEditChecklistItem({ text: '' })}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add item
                    </button>
                  </div>
                  <div className="space-y-3">
                    {editChecklistFields.map((field, index) => (
                      <div key={field.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3 animate-slide-up">
                        <div className="flex items-start gap-3">
                          <span className="mt-2.5 w-6 h-6 flex-shrink-0 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <textarea
                            {...editForm.register(`checklistItems.${index}.text` as const)}
                            placeholder="What needs to be done?"
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                            rows={1}
                          />
                          <button
                            type="button"
                            onClick={() => removeEditChecklistItem(index)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="pl-9 flex items-center gap-4">
                          <div className="relative group">
                            <input
                              type="file"
                              id={`edit-checklist-img-${index}`}
                              className="hidden"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setChecklistImageLoading(prev => ({ ...prev, [index]: true }));
                                try {
                                  const { url } = await taskApi.uploadTaskImage(file);
                                  editForm.setValue(`checklistItems.${index}.referenceMediaUrl`, url);
                                } finally {
                                  setChecklistImageLoading(prev => ({ ...prev, [index]: false }));
                                }
                              }}
                            />
                            <label
                              htmlFor={`edit-checklist-img-${index}`}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-emerald-400 hover:text-emerald-600 cursor-pointer transition-all"
                            >
                              {checklistImageLoading[index] ? (
                                <LoadingSpinner className="h-3 w-3" />
                              ) : editForm.watch(`checklistItems.${index}.referenceMediaUrl`) ? (
                                <>
                                  <ImagePlus className="h-3.5 w-3.5 text-emerald-500" />
                                  Change image
                                </>
                              ) : (
                                <>
                                  <ImagePlus className="h-3.5 w-3.5" />
                                  Add image
                                </>
                              )}
                            </label>
                          </div>
                          {editForm.watch(`checklistItems.${index}.referenceMediaUrl`) && (
                            <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-gray-200 group">
                              <img src={editForm.watch(`checklistItems.${index}.referenceMediaUrl`)} className="h-full w-full object-cover" alt="" />
                              <button
                                type="button"
                                onClick={() => editForm.setValue(`checklistItems.${index}.referenceMediaUrl`, '')}
                                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {editChecklistFields.length === 0 && (
                      <p className="text-center py-4 text-sm text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                        No checklist items added yet.
                      </p>
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/60 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      {...editForm.register('mandatoryProofOfCompletion')}
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">Mandatory proof of completion</span>
                      <span className="block text-xs text-gray-600 mt-0.5">
                        Staff must upload a photo to complete, or explain why they could not. Checklist items also need proof or a reason.
                      </span>
                    </span>
                  </label>
                </section>

                {/* Photo */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <ImagePlus className="h-4 w-4" /> Photo (optional)
                  </h3>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                  {imageUrl ? (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="h-32 bg-gray-100 flex items-center justify-center">
                        <img src={imageUrl} alt="Task" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex gap-2 p-3">
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="flex-1 py-2 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-medium">
                          {uploadingImage ? 'Uploading...' : 'Change'}
                        </button>
                        <button type="button" onClick={() => { setImageUrl(''); setImageFile(null); }} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium">
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full py-8 rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors flex flex-col items-center gap-2"
                    >
                      <ImagePlus className="h-10 w-10 text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">{uploadingImage ? 'Uploading...' : 'Add photo'}</span>
                    </button>
                  )}
                </section>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button type="submit" disabled={updateMutation.isPending} className="flex-1 px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all">
                    {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="px-5 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 animate-slide-up relative">
            <button type="button" onClick={() => setConfirmDelete(null)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <p className="text-gray-900 font-medium pr-8">Delete &quot;{confirmDelete.title}&quot;?</p>
            <p className="text-sm text-gray-500 mt-1">This task template will be removed.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => deleteMutation.mutate(confirmDelete._id)} disabled={deleteMutation.isPending} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">Delete</button>
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch delete confirm */}
      {batchConfirmDelete && selectedCount > 0 && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 animate-slide-up relative">
            <button
              type="button"
              onClick={() => setBatchConfirmDelete(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-gray-900 font-medium pr-8">
              Delete {selectedCount} task{selectedCount === 1 ? '' : 's'}?
            </p>
            <p className="text-sm text-gray-500 mt-1">These task templates will be permanently removed.</p>
            {batchDeleteMutation.isError && (
              <p className="mt-3 text-sm text-red-600">{getApiErrorMessage(batchDeleteMutation.error)}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => batchDeleteMutation.mutate([...selectedTemplateIds])}
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

      {/* Batch action bar */}
      {selectionMode && selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-gray-800/10 bg-gray-900 px-4 py-3 text-white shadow-2xl sm:gap-3 sm:px-6">
          <span className="text-sm font-medium sm:pr-2">
            {selectedCount} selected
          </span>
          <button
            type="button"
            onClick={openBatchTransfer}
            disabled={outlets.length < 2}
            title={outlets.length < 2 ? 'Add another outlet to transfer tasks' : undefined}
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
            onClick={clearTemplateSelection}
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
          void refreshTaskQueries();
        }}
      />
    </div>
  );
}
