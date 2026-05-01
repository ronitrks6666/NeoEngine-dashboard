import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { startOfDay } from 'date-fns';
import { useOutletStore } from '@/stores/outletStore';
import { taskApi } from '@/api/task';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SearchableSelect } from '@/components/SearchableSelect';
import { TimePickerField } from '@/components/TimePickerField';
import { CalendarDateField } from '@/components/CalendarDateField';
import { ListSearchBar } from '@/components/ListSearchBar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import {
  CheckSquare,
  Calendar,
  Clock,
  Users,
  User,
  ImagePlus,
  Sun,
  Moon,
  ListTodo,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  parentRoleId: z.string().min(1, 'Role is required'),
  assignToType: z.enum(['role', 'staff']),
  assignToEmployeeId: z.string().optional(),
  shiftType: z.enum(['Day', 'Night', 'Both']),
  taskType: z.enum(['daily', 'weekly', 'specific-days', 'onetime']),
  specificDate: z.string().optional(),
  specificDays: z.array(z.number()).optional(),
  multipleTimesPerDay: z.boolean().default(false),
  intervalMinutes: z.coerce.number().optional(),
  startTime: z.string().optional(),
  timeLimitMinutes: z.coerce.number().optional(),
  checklistItems: z.array(z.object({
    text: z.string().min(1, 'Item text required'),
    referenceMediaUrl: z.string().optional(),
  })).optional(),
});

type TaskForm = z.infer<typeof taskSchema>;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TasksPage() {
  const { selectedOutletId, outlets } = useOutletStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<{
    _id: string;
    title?: string;
    description?: string;
    parentRoleId?: { _id?: string; name?: string };
    shiftType?: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ _id: string; title?: string } | null>(null);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
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
    enabled: !!selectedOutletId,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['parent-roles'],
    queryFn: () => employeeApi.getParentRoles(),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['my-employees', selectedOutletId],
    queryFn: () => employeeApi.getMyEmployees({ outletId: selectedOutletId!, limit: 200 }),
    enabled: !!selectedOutletId && showCreate,
  });

  const createRoleMutation = useMutation({
    mutationFn: (name: string) => employeeApi.createParentRole(name, selectedOutletId ?? undefined),
    onSuccess: (res) => {
      const newRole = res?.data?.parentRole;
      if (newRole) {
        queryClient.invalidateQueries({ queryKey: ['parent-roles'] });
        queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
        form.setValue('parentRoleId', newRole._id);
        setShowCreateRole(false);
        setNewRoleName('');
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof taskApi.createTemplate>[0]) => taskApi.createTemplate(payload),
    onSuccess: () => {
      if (selectedOutletId) {
        queryClient.invalidateQueries({ queryKey: ['task-templates', selectedOutletId] });
      }
      setShowCreate(false);
      form.reset(defaultFormValues);
      setImageUrl('');
      setImageFile(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskForm> }) =>
      taskApi.updateTemplate(id, {
        ...data,
        assignToType: 'role',
        timeLimitMinutes: data.timeLimitMinutes ? parseInt(String(data.timeLimitMinutes), 10) : undefined,
      }),
    onSuccess: () => {
      if (selectedOutletId) {
        queryClient.invalidateQueries({ queryKey: ['task-templates', selectedOutletId] });
      }
      setEditing(null);
      editForm.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taskApi.deleteTemplate(id),
    onSuccess: () => {
      if (selectedOutletId) {
        queryClient.invalidateQueries({ queryKey: ['task-templates', selectedOutletId] });
      }
      setConfirmDelete(null);
    },
  });

  const defaultFormValues: TaskForm = {
    title: '',
    description: '',
    parentRoleId: '',
    shiftType: 'Both',
    taskType: 'daily',
    specificDate: '',
    specificDays: [],
    multipleTimesPerDay: false,
    intervalMinutes: '60',
    startTime: '',
    timeLimitMinutes: '',
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
  const parentRoles = rolesData?.data?.parentRoles ?? [];
  const employees = (employeesData as { data?: { employees?: unknown[] } })?.data?.employees ?? [];
  const assigneeEmployeeOptions = useMemo(
    () =>
      (employees as { _id: string; name: string; activeRoleId?: { name?: string; parentRoleId?: { name?: string } } }[]).map(
        (emp) => ({
          value: emp._id,
          label: `${emp.activeRoleId?.name || emp.activeRoleId?.parentRoleId?.name || 'Staff'} — ${emp.name}`,
        })
      ),
    [employees]
  );

  const parentRoleSelectOptions = useMemo(
    () => (parentRoles as { _id: string; name: string }[]).map((r) => ({ value: r._id, label: r.name })),
    [parentRoles]
  );

  const taskShiftEditOptions = useMemo(
    () => [
      { value: 'Both', label: 'Both' },
      { value: 'Day', label: 'Day' },
      { value: 'Night', label: 'Night' },
    ],
    []
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
      if (t.taskType) form.setValue('taskType', t.taskType as 'daily' | 'onetime' | 'specific-days');
      if (t.specificDate) form.setValue('specificDate', String(t.specificDate));
      if (Array.isArray(t.specificDays)) form.setValue('specificDays', t.specificDays);
      if (typeof t.multipleTimesPerDay === 'boolean') form.setValue('multipleTimesPerDay', t.multipleTimesPerDay);
      if (t.intervalMinutes != null) form.setValue('intervalMinutes', String(t.intervalMinutes));
      if (t.shiftType) form.setValue('shiftType', t.shiftType as 'Day' | 'Night' | 'Both');
      if (t.assignToType) form.setValue('assignToType', t.assignToType as 'role' | 'staff');
      if (t.parentRoleId) form.setValue('parentRoleId', String(t.parentRoleId));
      if (t.assignToEmployeeId) form.setValue('assignToEmployeeId', String(t.assignToEmployeeId));
      if (t.startTime) form.setValue('startTime', String(t.startTime));
      if (t.timeLimitMinutes != null) form.setValue('timeLimitMinutes', String(t.timeLimitMinutes));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, selectedOutletId]);

  const openEdit = (t: {
    _id: string;
    title?: string;
    description?: string;
    parentRoleId?: { _id?: string; name?: string };
    shiftType?: string;
  }) => {
    setEditing(t);
    editForm.reset({
      title: t.title ?? '',
      description: t.description ?? '',
      parentRoleId: (t.parentRoleId as { _id?: string })?._id ?? '',
      shiftType: (t.shiftType as 'Day' | 'Night' | 'Both') ?? 'Both',
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
    if (assignToType === 'role' && !d.parentRoleId) {
      form.setError('parentRoleId', { message: 'Select a role' });
      return;
    }
    if (assignToType === 'staff' && !d.assignToEmployeeId) {
      form.setError('assignToEmployeeId', { message: 'Select a staff member' });
      return;
    }
    const payload = {
      title: d.title,
      description: d.description || undefined,
      outletId,
      shiftType: d.shiftType ?? 'Both',
      taskType: d.taskType ?? 'daily',
      specificDate: d.taskType === 'onetime' && d.specificDate ? d.specificDate : undefined,
      specificDays: d.taskType === 'specific-days' && d.specificDays?.length ? d.specificDays : undefined,
      imageUrl: imageUrl || undefined,
      hourlyFrequency:
        d.multipleTimesPerDay && d.intervalMinutes
          ? Math.max(1, Math.floor(60 / (parseInt(d.intervalMinutes, 10) || 60)))
          : 1,
      assignToType,
      assignToRoleId: assignToType === 'role' ? d.parentRoleId : undefined,
      assignToEmployeeId: assignToType === 'staff' ? d.assignToEmployeeId : undefined,
      parentRoleId: assignToType === 'role' ? d.parentRoleId : undefined,
      startTime: d.startTime || undefined,
      timeLimitMinutes: d.timeLimitMinutes ? parseInt(d.timeLimitMinutes, 10) : undefined,
      checklistItems: d.checklistItems?.map((item, idx) => ({
        ...item,
        order: idx,
      })),
    };
    createMutation.mutate(payload);
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
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task templates</h1>
            <p className="text-gray-500 mt-0.5">Define tasks for your staff</p>
          </div>
          <button
            onClick={() => {
              form.reset({ ...defaultFormValues });
              setVoiceError(null);
              setShowCreate(true);
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-emerald flex items-center gap-2 w-fit shrink-0"
          >
            <ListTodo className="h-5 w-5" /> Create task
          </button>
        </div>
        <ListSearchBar
          value={templateSearch}
          onChange={setTemplateSearch}
          placeholder="Search templates by title or description"
          className="max-w-xl"
          id="tasks-search"
          aria-label="Search task templates"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in-stagger">
          {templates.map((t: { _id: string; title?: string; description?: string; parentRoleId?: { name: string }; shiftType?: string }) => (
            <div key={t._id} className="group rounded-2xl border border-emerald-100 p-5 card-hover bg-white overflow-hidden shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckSquare className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setConfirmDelete({ _id: t._id, title: t.title })} className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="font-semibold text-gray-900 truncate">{t.title ?? 'Untitled'}</p>
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{t.description || 'No description'}</p>
              <div className="flex gap-2 mt-3">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700">{t.parentRoleId?.name ?? '-'}</span>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600">{t.shiftType ?? 'Both'}</span>
              </div>
            </div>
          ))}
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
          {!debouncedTemplateSearch.trim() && (
            <button onClick={() => setShowCreate(true)} className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium">
              Create your first task
            </button>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto animate-slide-up overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col relative">
            <button type="button" onClick={() => setShowCreate(false)} className="absolute top-4 right-4 p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors z-10" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-6 py-5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <CheckSquare className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Create Task</h2>
                  <p className="text-emerald-100 text-sm mt-0.5">Define a new task with all options</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {createMutation.isError && (
                <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{getApiErrorMessage(createMutation.error)}</p>
              )}
              <form onSubmit={handleCreateSubmit} className="space-y-6">
                {/* Basic info */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" /> Basic info
                    </h3>
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
                          if (task.taskType) form.setValue('taskType', task.taskType as 'daily' | 'onetime' | 'specific-days');
                          if (task.specificDate) form.setValue('specificDate', task.specificDate as string);
                          if (Array.isArray(task.specificDays)) form.setValue('specificDays', task.specificDays);
                          if (typeof task.multipleTimesPerDay === 'boolean') form.setValue('multipleTimesPerDay', task.multipleTimesPerDay);
                          if (task.intervalMinutes != null) form.setValue('intervalMinutes', String(task.intervalMinutes));
                          if (task.shiftType) form.setValue('shiftType', task.shiftType as 'Day' | 'Night' | 'Both');
                          if (task.assignToType) form.setValue('assignToType', task.assignToType as 'role' | 'staff');
                          const pr = task.parentRoleId;
                          if (typeof pr === 'string') form.setValue('parentRoleId', pr);
                          const ae = task.assignToEmployeeId;
                          if (typeof ae === 'string') form.setValue('assignToEmployeeId', ae);
                          if (task.startTime) form.setValue('startTime', task.startTime as string);
                          if (task.timeLimitMinutes != null) form.setValue('timeLimitMinutes', String(task.timeLimitMinutes));
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

                {/* Schedule */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Schedule
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">When</label>
                    <div className="flex flex-wrap gap-2">
                      {(['daily', 'onetime', 'specific-days'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => form.setValue('taskType', type)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            form.watch('taskType') === type ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {type === 'daily' ? 'Daily' : type === 'onetime' ? 'One-time' : 'Specific days'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.watch('taskType') === 'onetime' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                      <Controller
                        name="specificDate"
                        control={form.control}
                        render={({ field }) => (
                          <CalendarDateField
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            minDate={minOneTimeTaskDate}
                            placeholder="Choose date for this task"
                          />
                        )}
                      />
                    </div>
                  )}
                  {form.watch('taskType') === 'specific-days' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select days</label>
                      <div className="flex flex-wrap gap-2">
                        {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                          const selected = (form.watch('specificDays') ?? []).includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                const current = form.watch('specificDays') ?? [];
                                const next = selected ? current.filter((x) => x !== d) : [...current, d].sort();
                                form.setValue('specificDays', next);
                              }}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                selected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {DAY_NAMES[d]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Multiple times per day</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => form.setValue('multipleTimesPerDay', false)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${!form.watch('multipleTimesPerDay') ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => form.setValue('multipleTimesPerDay', true)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${form.watch('multipleTimesPerDay') ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                      >
                        Yes
                      </button>
                    </div>
                    {form.watch('multipleTimesPerDay') && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-gray-600">Every</span>
                        <input
                          type="number"
                          {...form.register('intervalMinutes')}
                          min={5}
                          max={120}
                          className="w-20 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        />
                        <span className="text-sm text-gray-600">minutes</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Shift */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Shift
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(['Both', 'Day', 'Night'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => form.setValue('shiftType', s)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          form.watch('shiftType') === s ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {s === 'Day' ? <Sun className="h-4 w-4" /> : s === 'Night' ? <Moon className="h-4 w-4" /> : null}
                        {s}
                      </button>
                    ))}
                  </div>
                </section>

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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                      <div className="flex flex-wrap gap-2 items-center">
                        {parentRoles.map((r: { _id: string; name: string }) => (
                          <button
                            key={r._id}
                            type="button"
                            onClick={() => form.setValue('parentRoleId', r._id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              form.watch('parentRoleId') === r._id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {r.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setShowCreateRole(true)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-emerald-400 text-emerald-600 text-sm font-medium hover:bg-emerald-50"
                        >
                          + Create role
                        </button>
                      </div>
                      {form.formState.errors.parentRoleId && form.watch('assignToType') === 'role' && (
                        <p className="text-red-600 text-sm mt-1">Select a role</p>
                      )}
                    </div>
                  )}
                  {form.watch('assignToType') === 'staff' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Staff member</label>
                      <SearchableSelect
                        value={form.watch('assignToEmployeeId') || ''}
                        onChange={(v) => form.setValue('assignToEmployeeId', v, { shouldValidate: true })}
                        options={assigneeEmployeeOptions}
                        placeholder="Select staff"
                        searchPlaceholder="Search staff…"
                        noOptionsText="No staff loaded"
                        emptyText="No matches"
                      />
                    </div>
                  )}
                </section>

                {/* Timing */}
                <section className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Time settings
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Start time</label>
                      <Controller
                        name="startTime"
                        control={form.control}
                        render={({ field }) => (
                          <TimePickerField
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            placeholder="09:00"
                            use12Hour={true}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Time limit (mins)</label>
                      <input type="number" {...form.register('timeLimitMinutes')} placeholder="e.g. 30" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                    </div>
                  </div>
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

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-slide-up relative">
            <div className="p-6 border-b border-gray-100 pr-12">
              <h2 className="text-xl font-semibold text-gray-900">Edit task</h2>
              <p className="text-sm text-gray-500 mt-0.5">{editing.title}</p>
            </div>
            <button type="button" onClick={() => setEditing(null)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="p-6">
              {updateMutation.isError && <p className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{getApiErrorMessage(updateMutation.error)}</p>}
              <form onSubmit={editForm.handleSubmit((d) => updateMutation.mutate({ id: editing._id, data: d }))} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input {...editForm.register('title')} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                  {editForm.formState.errors.title && <p className="text-red-600 text-sm mt-1">{editForm.formState.errors.title.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea {...editForm.register('description')} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <SearchableSelect
                    value={editForm.watch('parentRoleId') || ''}
                    onChange={(v) => editForm.setValue('parentRoleId', v, { shouldValidate: true })}
                    options={parentRoleSelectOptions}
                    placeholder="Role"
                    searchPlaceholder="Search roles…"
                    noOptionsText="No roles"
                    emptyText="No matches"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                  <SearchableSelect
                    value={editForm.watch('shiftType') || 'Both'}
                    onChange={(v) =>
                      editForm.setValue('shiftType', v as 'Day' | 'Night' | 'Both', { shouldValidate: true })
                    }
                    options={taskShiftEditOptions}
                    placeholder="Shift"
                    showSearch={false}
                    noOptionsText="—"
                    emptyText="—"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={updateMutation.isPending} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setEditing(null)} className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
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
    </div>
  );
}
