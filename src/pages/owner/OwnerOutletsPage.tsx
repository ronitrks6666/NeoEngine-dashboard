import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ownerApi, type Outlet } from '@/api/owner';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AddressSearchInput } from '@/components/AddressSearchInput';
import { Store, Phone, Locate, X, Pencil, Trash2, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { zPhone10 } from '@/lib/phoneValidation';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ListSearchBar } from '@/components/ListSearchBar';
import { OwnerBrandSettingsCard } from '@/components/OwnerBrandSettingsCard';

/** Lat/lng while typing: optional leading '-', digits, one decimal point. */
function sanitizeCoordTyping(raw: string): string {
  let out = '';
  let dot = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (i === 0 && c === '-') {
      out += '-';
      continue;
    }
    if (c === '.' && !dot) {
      dot = true;
      out += '.';
      continue;
    }
    if (c >= '0' && c <= '9') out += c;
  }
  return out;
}

/** Radius: digits and at most one '.' (positive). */
function sanitizePositiveDecimalTyping(raw: string): string {
  let out = '';
  let dot = false;
  for (const c of raw) {
    if (c === '.' && !dot) {
      dot = true;
      out += '.';
      continue;
    }
    if (c >= '0' && c <= '9') out += c;
  }
  return out;
}

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function normalizeGstInput(value: string) {
  return value.toUpperCase().replace(/\s+/g, '');
}

function validateGstOptional(raw: string): { value: string; ok: boolean; message?: string } {
  const value = normalizeGstInput(raw || '');
  if (!value) return { value, ok: true };
  if (GST_REGEX.test(value)) return { value, ok: true };
  return { value, ok: false, message: 'Invalid GST format. Example: 29ABCDE1234F1Z5' };
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

type OpeningHourDay = {
  day: string;
  closed: boolean;
  openTime: string;
  closeTime: string;
};

type EditShift = { _id?: string; name: string; startTime: string; endTime: string };

const DEFAULT_SHIFTS: EditShift[] = [
  { name: 'Shift 1', startTime: '06:00', endTime: '14:00' },
  { name: 'Shift 2', startTime: '14:00', endTime: '22:00' },
];

function createDefaultOpeningHours(): OpeningHourDay[] {
  return WEEKDAYS.map((day) => ({
    day,
    closed: false,
    openTime: '09:00',
    closeTime: '22:00',
  }));
}

function normalizeOpeningHoursFromOutlet(raw: unknown): OpeningHourDay[] {
  const defaults = createDefaultOpeningHours();
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const byDay = new Map<string, OpeningHourDay>();
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const day = String((row as { day?: string }).day || '');
    if (!WEEKDAYS.includes(day as (typeof WEEKDAYS)[number])) continue;
    const r = row as OpeningHourDay;
    byDay.set(day, {
      day,
      closed: !!r.closed,
      openTime: String(r.openTime || '09:00'),
      closeTime: String(r.closeTime || '22:00'),
    });
  }
  return defaults.map((d) => byDay.get(d.day) || d);
}

function parseGeofence(state: CreateOutletState) {
  if (!state.geofenceLat || !state.geofenceLng || !state.geofenceRadius) return undefined;
  const latitude = parseFloat(state.geofenceLat);
  const longitude = parseFloat(state.geofenceLng);
  const radius = parseFloat(state.geofenceRadius);
  if (Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(radius)) return undefined;
  return { latitude, longitude, radius };
}

function UseCurrentLocationButton({ onLocation }: { onLocation: (lat: number, lng: number) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleClick = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocation(pos.coords.latitude, pos.coords.longitude);
        setLoading(false);
      },
      () => {
        setError('Could not get location');
        setLoading(false);
      }
    );
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title="Fill latitude and longitude from this device"
      className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-teal-200 bg-teal-50/50 text-teal-700 text-sm font-medium hover:bg-teal-100 transition-colors disabled:opacity-50"
    >
      <Locate className="h-4 w-4" />
      {loading ? 'Getting location...' : 'Use my current location'}
      {error && <span className="text-red-600 text-xs ml-1">({error})</span>}
    </button>
  );
}

const createSchema = z.object({
  name: z.string().min(1, 'Name required'),
  address: z.string().min(1, 'Address required'),
  phone: zPhone10,
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = CreateForm;

interface CreateOutletState {
  geofenceLat: string;
  geofenceLng: string;
  geofenceRadius: string;
}

async function syncOutletShifts(
  outletId: string,
  current: EditShift[],
  initial: EditShift[]
) {
  const normalized = current
    .map((s) => ({
      _id: s._id,
      name: s.name.trim(),
      startTime: s.startTime.trim(),
      endTime: s.endTime.trim(),
    }))
    .filter((s) => s.name.length > 0);

  if (normalized.length === 0) {
    throw new Error('Add at least one shift with a name');
  }
  if (
    normalized.some(
      (s) => !/^\d{1,2}:\d{2}$/.test(s.startTime) || !/^\d{1,2}:\d{2}$/.test(s.endTime)
    )
  ) {
    throw new Error('Shift times must use HH:mm format');
  }
  const namesLower = normalized.map((s) => s.name.toLowerCase());
  if (new Set(namesLower).size !== namesLower.length) {
    throw new Error('Shift names must be unique');
  }

  const initialById = new Map(
    initial
      .filter((s) => !!s._id)
      .map((s) => [s._id as string, { name: s.name, startTime: s.startTime, endTime: s.endTime }])
  );
  const currentById = new Map(
    normalized
      .filter((s) => !!s._id)
      .map((s) => [s._id as string, { name: s.name, startTime: s.startTime, endTime: s.endTime }])
  );

  for (const shiftId of initialById.keys()) {
    if (!currentById.has(shiftId)) {
      await ownerApi.deleteShift(shiftId);
    }
  }

  for (const [shiftId, cur] of currentById.entries()) {
    const prev = initialById.get(shiftId);
    if (!prev) continue;
    if (cur.name !== prev.name || cur.startTime !== prev.startTime || cur.endTime !== prev.endTime) {
      await ownerApi.updateShift(shiftId, cur);
    }
  }

  const created = normalized
    .filter((s) => !s._id)
    .map((s) => ({ name: s.name, startTime: s.startTime, endTime: s.endTime }));
  if (created.length > 0) {
    await ownerApi.createShifts(outletId, created);
  }
}

export function OwnerOutletsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Outlet | null>(null);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setShowCreate(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('create');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [confirmDelete, setConfirmDelete] = useState<Outlet | null>(null);
  const [listSearch, setListSearch] = useState('');
  const debouncedListSearch = useDebouncedValue(listSearch, 350);
  const [createGeofence, setCreateGeofence] = useState<CreateOutletState>({
    geofenceLat: '',
    geofenceLng: '',
    geofenceRadius: '100',
  });
  const [editGeofence, setEditGeofence] = useState<CreateOutletState>({
    geofenceLat: '',
    geofenceLng: '',
    geofenceRadius: '100',
  });
  const [editGst, setEditGst] = useState('');
  const [createGst, setCreateGst] = useState('');
  const [editPunchInTime, setEditPunchInTime] = useState('09:00');
  const [editShiftAutoLogoutGraceHours, setEditShiftAutoLogoutGraceHours] = useState('6');
  const [editStaffNotificationSoundId, setEditStaffNotificationSoundId] = useState<'default' | 'urgent'>(
    'default'
  );
  const [editPostShiftEnabled, setEditPostShiftEnabled] = useState(false);
  const [editPostShiftShadow, setEditPostShiftShadow] = useState(false);
  const [editPostShiftGrace, setEditPostShiftGrace] = useState('30');
  const [editPostShiftEscalation, setEditPostShiftEscalation] = useState('15');
  const [editPostShiftHardCutoff, setEditPostShiftHardCutoff] = useState('60');
  const [editOpeningHours, setEditOpeningHours] = useState<OpeningHourDay[]>(createDefaultOpeningHours);
  const [editShifts, setEditShifts] = useState<EditShift[]>(DEFAULT_SHIFTS.map((s) => ({ ...s })));
  const [initialEditShifts, setInitialEditShifts] = useState<EditShift[]>([]);
  const [expandedShiftKey, setExpandedShiftKey] = useState<string | null>(null);
  const [expandedHoursDay, setExpandedHoursDay] = useState<string | null>(null);
  const [editLoadingExtras, setEditLoadingExtras] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: outlets = [], isLoading } = useQuery({
    queryKey: ['owner-outlets', debouncedListSearch],
    queryFn: () => ownerApi.getOutlets({ search: debouncedListSearch.trim() || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      address: string;
      phone: string;
      gstNumber?: string;
      geofence?: { latitude: number; longitude: number; radius: number };
    }) => {
      const res = await ownerApi.createOutlet(payload);
      const id = res?.data?.outlet?.id || res?.data?.outlet?._id;
      if (id) {
        await ownerApi.createShifts(
          String(id),
          DEFAULT_SHIFTS.map((s) => ({
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        );
      }
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner-outlets'] });
      setShowCreate(false);
      createForm.reset();
      setCreateGst('');
      setCreateGeofence({ geofenceLat: '', geofenceLng: '', geofenceRadius: '100' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
      shifts,
      initialShifts,
    }: {
      id: string;
      data: Parameters<typeof ownerApi.updateOutlet>[1];
      shifts: EditShift[];
      initialShifts: EditShift[];
    }) => {
      await ownerApi.updateOutlet(id, data);
      await syncOutletShifts(id, shifts, initialShifts);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner-outlets'] });
      setEditing(null);
      editForm.reset();
      setEditFormError(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ownerApi.deleteOutlet(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner-outlets'] });
      setConfirmDelete(null);
    },
  });

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', address: '', phone: '' },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', address: '', phone: '' },
  });

  const openEdit = async (o: Outlet) => {
    setEditing(o);
    setEditFormError(null);
    editForm.reset({ name: o.name, address: o.address ?? '', phone: o.phone ?? '' });
    const g = o.geofence;
    setEditGeofence({
      geofenceLat: g?.latitude?.toString() ?? '',
      geofenceLng: g?.longitude?.toString() ?? '',
      geofenceRadius: g?.radius?.toString() ?? '100',
    });
    setEditGst(String(o.gstNumber || ''));
    setEditPunchInTime(o.punchInTime || '09:00');
    setEditShiftAutoLogoutGraceHours(
      o.shiftAutoLogoutGraceHours != null ? String(o.shiftAutoLogoutGraceHours) : '6'
    );
    setEditStaffNotificationSoundId(
      o.staffNotificationSoundId === 'urgent' ? 'urgent' : 'default'
    );
    const pse = o.postShiftEnforcement || {};
    setEditPostShiftEnabled(Boolean(pse.enabled));
    setEditPostShiftShadow(Boolean(pse.shadowMode));
    setEditPostShiftGrace(
      pse.graceWindowMinutes != null ? String(pse.graceWindowMinutes) : '30'
    );
    setEditPostShiftEscalation(
      pse.escalationWindowMinutes != null ? String(pse.escalationWindowMinutes) : '15'
    );
    setEditPostShiftHardCutoff(
      pse.hardCutoffMinutes != null ? String(pse.hardCutoffMinutes) : '60'
    );
    setEditOpeningHours(normalizeOpeningHoursFromOutlet(o.openingHours));
    setExpandedShiftKey(null);
    setExpandedHoursDay(null);
    setEditLoadingExtras(true);
    try {
      const fetched = await ownerApi.getShifts(o._id);
      const mapped: EditShift[] = (fetched || [])
        .filter((s) => s && s.name)
        .map((s) => ({
          _id: String(s._id),
          name: String(s.name || ''),
          startTime: String(s.startTime || '09:00'),
          endTime: String(s.endTime || '17:00'),
        }));
      if (mapped.length > 0) {
        setEditShifts(mapped);
        setInitialEditShifts(mapped);
      } else {
        setEditShifts([{ name: '', startTime: '09:00', endTime: '17:00' }]);
        setInitialEditShifts([]);
      }
    } catch {
      setEditShifts(DEFAULT_SHIFTS.map((s) => ({ ...s })));
      setInitialEditShifts([]);
    } finally {
      setEditLoadingExtras(false);
    }
  };

  const gstCheck = validateGstOptional(editGst);
  const createGstCheck = validateGstOptional(createGst);

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outlets</h1>
          <p className="text-gray-500 mt-0.5">Your restaurant or retail locations</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:items-center">
          <ListSearchBar
            value={listSearch}
            onChange={setListSearch}
            placeholder="Search by name, address, or phone"
            className="sm:min-w-[20rem] sm:max-w-md flex-1"
            id="outlets-search"
            aria-label="Search outlets"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2 w-fit shrink-0"
          >
            <span>+</span> Create outlet
          </button>
        </div>
      </div>

      <OwnerBrandSettingsCard />

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in-stagger">
          {outlets.map((o) => (
            <div key={o._id} className="group rounded-2xl border border-gray-200 p-5 card-hover bg-white overflow-hidden">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center text-teal-600"
                  title="Outlet location"
                >
                  <Store className="h-6 w-6" aria-hidden />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openEdit(o)}
                    className="p-2 rounded-lg hover:bg-teal-50 text-gray-500 hover:text-teal-600 transition-colors"
                    title="Edit outlet details"
                    aria-label="Edit outlet details"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(o)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                    title="Remove outlet"
                    aria-label="Remove outlet"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="font-semibold text-gray-900 truncate">{o.name}</p>
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{o.address || '-'}</p>
              <p className="text-sm text-gray-500 mt-1">{o.phone || '-'}</p>
              <button
                type="button"
                onClick={() => openEdit(o)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
                title="Edit address and map location (geofence)"
              >
                <Locate className="h-4 w-4" aria-hidden />
                Edit location (GPS)
              </button>
            </div>
          ))}
        </div>
      )}

      {outlets.length === 0 && !isLoading && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto mb-4 opacity-80">
            <Store className="h-8 w-8 text-teal-600" aria-hidden />
          </div>
          <p className="text-gray-500">
            {debouncedListSearch.trim() ? 'No outlets match your search.' : 'No outlets yet'}
          </p>
          {!debouncedListSearch.trim() && (
            <button onClick={() => setShowCreate(true)} className="mt-4 text-teal-600 hover:text-teal-700 font-medium">
              Create your first outlet
            </button>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto animate-slide-up overflow-hidden border border-gray-100 relative">
            <button type="button" onClick={() => setShowCreate(false)} className="absolute top-4 right-4 p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors z-10" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Create outlet</h2>
                  <p className="text-teal-100 text-sm mt-0.5">Adds Shift 1 & Shift 2 by default</p>
                </div>
              </div>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {createMutation.isError && (
                <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{getApiErrorMessage(createMutation.error)}</p>
              )}
              <form
                onSubmit={createForm.handleSubmit((d) => {
                  if (!createGstCheck.ok) return;
                  createMutation.mutate({
                    ...d,
                    gstNumber: createGstCheck.value || undefined,
                    geofence: parseGeofence(createGeofence),
                  });
                })}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...createForm.register('name')}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-colors"
                      placeholder="e.g. Main Branch, Downtown Store"
                    />
                  </div>
                  {createForm.formState.errors.name && <p className="text-red-600 text-sm mt-1">{createForm.formState.errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <p className="text-xs text-gray-500 mb-2">Search for an address or type manually</p>
                  <AddressSearchInput
                    value={createForm.watch('address')}
                    onChange={(v) => createForm.setValue('address', v, { shouldValidate: true })}
                    onPlaceSelect={(details) => {
                      createForm.setValue('address', details.address, { shouldValidate: true });
                      if (details.name) createForm.setValue('name', details.name, { shouldValidate: true });
                      setCreateGeofence((prev) => ({
                        ...prev,
                        geofenceLat: details.lat.toFixed(6),
                        geofenceLng: details.lng.toFixed(6),
                        geofenceRadius: prev.geofenceRadius || '100',
                      }));
                    }}
                    placeholder="Search address or place..."
                    error={createForm.formState.errors.address?.message}
                  />
                  {createForm.watch('address') && !createGeofence.geofenceLat && (
                    <UseCurrentLocationButton
                      onLocation={(lat, lng) =>
                        setCreateGeofence((prev) => ({
                          ...prev,
                          geofenceLat: lat.toFixed(6),
                          geofenceLng: lng.toFixed(6),
                          geofenceRadius: prev.geofenceRadius || '100',
                        }))
                      }
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" aria-hidden />
                    <Controller
                      name="phone"
                      control={createForm.control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={10}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-colors tracking-wide"
                          placeholder="10-digit contact number"
                        />
                      )}
                    />
                  </div>
                  {createForm.formState.errors.phone && <p className="text-red-600 text-sm mt-1">{createForm.formState.errors.phone.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">GST Number</label>
                  <input
                    type="text"
                    value={createGst}
                    onChange={(e) => setCreateGst(normalizeGstInput(e.target.value).slice(0, 15))}
                    maxLength={15}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white uppercase tracking-wide"
                    placeholder="29ABCDE1234F1Z5"
                  />
                  {!createGstCheck.ok && createGstCheck.message ? (
                    <p className="text-red-600 text-sm mt-1">{createGstCheck.message}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Optional. 15-character GSTIN.</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || !createGstCheck.ok}
                    className="flex-1 px-5 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create outlet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-5 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto animate-slide-up overflow-hidden border border-gray-100 relative">
            <button type="button" onClick={() => setEditing(null)} className="absolute top-4 right-4 p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors z-10" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-6 py-5">
              <h2 className="text-xl font-bold text-white">Edit outlet</h2>
              <p className="text-teal-100 text-sm mt-0.5">{editing.name}</p>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              {(updateMutation.isError || editFormError) && (
                <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
                  {editFormError || getApiErrorMessage(updateMutation.error)}
                </p>
              )}
              {editLoadingExtras ? (
                <LoadingSpinner className="py-10" />
              ) : (
                <form
                  onSubmit={editForm.handleSubmit((d) => {
                    setEditFormError(null);
                    if (!gstCheck.ok) {
                      setEditFormError(gstCheck.message || 'Invalid GST number');
                      return;
                    }
                    if (!/^\d{1,2}:\d{2}$/.test(editPunchInTime.trim())) {
                      setEditFormError('Punch-in time must use HH:mm format');
                      return;
                    }
                    const autoLogoutGraceHours = Number(editShiftAutoLogoutGraceHours);
                    if (
                      !Number.isFinite(autoLogoutGraceHours) ||
                      autoLogoutGraceHours < 0 ||
                      autoLogoutGraceHours > 24 ||
                      !Number.isInteger(autoLogoutGraceHours)
                    ) {
                      setEditFormError('Auto attendance logout grace must be a whole number from 0 to 24 hours');
                      return;
                    }
                    const graceMins = Number(editPostShiftGrace);
                    const escMins = Number(editPostShiftEscalation);
                    const hardMins = Number(editPostShiftHardCutoff);
                    const postShiftOk = [graceMins, escMins, hardMins].every(
                      (n) => Number.isFinite(n) && n >= 0 && n <= 24 * 60 && Number.isInteger(n)
                    );
                    if (!postShiftOk) {
                      setEditFormError(
                        'Post-shift windows must be whole minutes from 0 to 1440'
                      );
                      return;
                    }
                    const openDayInvalid = editOpeningHours.some(
                      (h) =>
                        !h.closed &&
                        (!/^\d{1,2}:\d{2}$/.test(h.openTime.trim()) ||
                          !/^\d{1,2}:\d{2}$/.test(h.closeTime.trim()))
                    );
                    if (openDayInvalid) {
                      setEditFormError('Opening hours must use HH:mm format for each open day');
                      return;
                    }
                    const geofence = parseGeofence(editGeofence);
                    updateMutation.mutate({
                      id: editing._id,
                      data: {
                        ...d,
                        geofence,
                        gstNumber: gstCheck.value || undefined,
                        punchInTime: editPunchInTime.trim(),
                        shiftAutoLogoutGraceHours: autoLogoutGraceHours,
                        staffNotificationSoundId: editStaffNotificationSoundId,
                        postShiftEnforcement: {
                          enabled: editPostShiftEnabled,
                          shadowMode: editPostShiftShadow,
                          graceWindowMinutes: graceMins,
                          escalationWindowMinutes: escMins,
                          hardCutoffMinutes: hardMins,
                        },
                        openingHours: editOpeningHours.map((h) => ({
                          day: h.day,
                          closed: h.closed,
                          openTime: h.openTime.trim(),
                          closeTime: h.closeTime.trim(),
                        })),
                      },
                      shifts: editShifts,
                      initialShifts: initialEditShifts,
                    });
                  })}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                    <div className="relative">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input {...editForm.register('name')} className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white" />
                    </div>
                    {editForm.formState.errors.name && <p className="text-red-600 text-sm mt-1">{editForm.formState.errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                    <AddressSearchInput
                      value={editForm.watch('address')}
                      onChange={(v) => editForm.setValue('address', v, { shouldValidate: true })}
                      onPlaceSelect={(details) => {
                        editForm.setValue('address', details.address, { shouldValidate: true });
                        if (details.name) editForm.setValue('name', details.name, { shouldValidate: true });
                        setEditGeofence((prev) => ({
                          ...prev,
                          geofenceLat: details.lat.toFixed(6),
                          geofenceLng: details.lng.toFixed(6),
                          geofenceRadius: prev.geofenceRadius || '100',
                        }));
                      }}
                      placeholder="Search address or place..."
                      error={editForm.formState.errors.address?.message}
                    />
                  </div>
                  <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">Outlet location (geofence)</label>
                      <p className="text-xs text-gray-600 mb-2">
                        Punch-in uses this area. Set coordinates manually or use your device&apos;s current position.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Latitude</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editGeofence.geofenceLat}
                            onChange={(e) =>
                              setEditGeofence((p) => ({ ...p, geofenceLat: sanitizeCoordTyping(e.target.value) }))
                            }
                            className="w-full mt-0.5 px-3 py-2 rounded-lg border border-teal-200 text-sm"
                            placeholder="e.g. 12.9716"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Longitude</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editGeofence.geofenceLng}
                            onChange={(e) =>
                              setEditGeofence((p) => ({ ...p, geofenceLng: sanitizeCoordTyping(e.target.value) }))
                            }
                            className="w-full mt-0.5 px-3 py-2 rounded-lg border border-teal-200 text-sm"
                            placeholder="e.g. 77.5946"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Radius (m)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editGeofence.geofenceRadius}
                            onChange={(e) =>
                              setEditGeofence((p) => ({
                                ...p,
                                geofenceRadius: sanitizePositiveDecimalTyping(e.target.value),
                              }))
                            }
                            className="w-full mt-0.5 px-3 py-2 rounded-lg border border-teal-200 text-sm"
                            placeholder="100"
                          />
                        </div>
                      </div>
                      <UseCurrentLocationButton
                        onLocation={(lat, lng) =>
                          setEditGeofence((prev) => ({
                            ...prev,
                            geofenceLat: lat.toFixed(6),
                            geofenceLng: lng.toFixed(6),
                            geofenceRadius: prev.geofenceRadius || '100',
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" aria-hidden />
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
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white tracking-wide"
                            placeholder="10-digit contact number"
                          />
                        )}
                      />
                    </div>
                    {editForm.formState.errors.phone && <p className="text-red-600 text-sm mt-1">{editForm.formState.errors.phone.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">GST Number</label>
                    <input
                      type="text"
                      value={editGst}
                      onChange={(e) => setEditGst(normalizeGstInput(e.target.value).slice(0, 15))}
                      maxLength={15}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white uppercase tracking-wide"
                      placeholder="29ABCDE1234F1Z5"
                    />
                    {!gstCheck.ok && gstCheck.message ? (
                      <p className="text-red-600 text-sm mt-1">{gstCheck.message}</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">Optional. 15-character GSTIN.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Default punch-in time</label>
                    <input
                      type="time"
                      value={editPunchInTime}
                      onChange={(e) => setEditPunchInTime(e.target.value)}
                      className="w-full max-w-[12rem] px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white"
                    />
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Auto attendance logout grace
                    </label>
                    <p className="text-xs text-gray-600">
                      Hours after an employee&apos;s scheduled shift ends before the system automatically punches them out.
                      This is attendance logout, not app logout.
                    </p>
                    <div className="flex items-center gap-2 max-w-[14rem]">
                      <input
                        type="number"
                        min={0}
                        max={24}
                        step={1}
                        value={editShiftAutoLogoutGraceHours}
                        onChange={(e) => setEditShiftAutoLogoutGraceHours(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                      <span className="text-sm text-gray-600 shrink-0">hours</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800">
                        Staff notification sound
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        One alert tone for all staff at this outlet (task reminders, staff calls). Your own owner tone stays in the mobile app Settings.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(
                        [
                          {
                            id: 'default' as const,
                            label: 'Standard',
                            description: 'Default Neo alert tone',
                          },
                          {
                            id: 'urgent' as const,
                            label: 'Urgent',
                            description: 'Louder urgent alert tone',
                          },
                        ] as const
                      ).map((opt) => {
                        const selected = editStaffNotificationSoundId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setEditStaffNotificationSoundId(opt.id)}
                            className={`text-left rounded-xl border px-3 py-3 transition-all ${
                              selected
                                ? 'border-violet-500 bg-white ring-2 ring-violet-500/20'
                                : 'border-violet-100 bg-white/70 hover:border-violet-300'
                            }`}
                          >
                            <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800">
                        Post-shift enforcement
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        After shift end, prompt staff still punched in and escalate or auto-logout based on these windows.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPostShiftEnabled}
                          onChange={(e) => setEditPostShiftEnabled(e.target.checked)}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        Enabled
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPostShiftShadow}
                          onChange={(e) => setEditPostShiftShadow(e.target.checked)}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        Shadow mode (log only, no punch-out)
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Grace (min)</label>
                        <input
                          type="number"
                          min={0}
                          max={1440}
                          step={1}
                          value={editPostShiftGrace}
                          onChange={(e) => setEditPostShiftGrace(e.target.value)}
                          className="w-full mt-0.5 px-3 py-2 rounded-lg border border-sky-200 bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Escalation (min)</label>
                        <input
                          type="number"
                          min={0}
                          max={1440}
                          step={1}
                          value={editPostShiftEscalation}
                          onChange={(e) => setEditPostShiftEscalation(e.target.value)}
                          className="w-full mt-0.5 px-3 py-2 rounded-lg border border-sky-200 bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Hard cutoff (min)</label>
                        <input
                          type="number"
                          min={0}
                          max={1440}
                          step={1}
                          value={editPostShiftHardCutoff}
                          onChange={(e) => setEditPostShiftHardCutoff(e.target.value)}
                          className="w-full mt-0.5 px-3 py-2 rounded-lg border border-sky-200 bg-white text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Shifts (IST)</p>
                      <p className="text-xs text-gray-500 mt-0.5">Edit names and times. Defaults are Shift 1 and Shift 2.</p>
                    </div>
                    {editShifts.map((s, i) => {
                      const rowKey = s._id || `new-${i}`;
                      const expanded = expandedShiftKey === rowKey;
                      return (
                        <div key={rowKey} className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50/40">
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => setExpandedShiftKey(expanded ? null : rowKey)}
                              className="flex-1 flex items-center gap-2 px-3 py-3 text-left hover:bg-gray-50"
                            >
                              {expanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {s.name.trim() || 'Shift'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {s.startTime || '--:--'} – {s.endTime || '--:--'}
                                </p>
                              </div>
                            </button>
                            {editShifts.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => setEditShifts((prev) => prev.filter((_, idx) => idx !== i))}
                                className="p-3 text-gray-400 hover:text-red-600"
                                aria-label="Remove shift"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                          {expanded ? (
                            <div className="px-3 pb-3 pt-1 border-t border-gray-200 space-y-3">
                              <div>
                                <label className="text-xs text-gray-500">Shift name</label>
                                <input
                                  type="text"
                                  value={s.name}
                                  onChange={(e) =>
                                    setEditShifts((prev) =>
                                      prev.map((row, idx) => (idx === i ? { ...row, name: e.target.value } : row))
                                    )
                                  }
                                  className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                  placeholder="e.g. Shift 1"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-gray-500">Start</label>
                                  <input
                                    type="time"
                                    value={s.startTime}
                                    onChange={(e) =>
                                      setEditShifts((prev) =>
                                        prev.map((row, idx) =>
                                          idx === i ? { ...row, startTime: e.target.value } : row
                                        )
                                      )
                                    }
                                    className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500">End</label>
                                  <input
                                    type="time"
                                    value={s.endTime}
                                    onChange={(e) =>
                                      setEditShifts((prev) =>
                                        prev.map((row, idx) =>
                                          idx === i ? { ...row, endTime: e.target.value } : row
                                        )
                                      )
                                    }
                                    className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...editShifts, { name: '', startTime: '09:00', endTime: '17:00' }];
                        setEditShifts(next);
                        setExpandedShiftKey(`new-${next.length - 1}`);
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add shift
                    </button>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Opening hours</p>
                      <p className="text-xs text-gray-500 mt-0.5">Set open/close times per day, or mark closed.</p>
                    </div>
                    {editOpeningHours.map((row, i) => {
                      const expanded = expandedHoursDay === row.day;
                      return (
                        <div key={row.day} className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50/40">
                          <button
                            type="button"
                            onClick={() => setExpandedHoursDay(expanded ? null : row.day)}
                            className="w-full flex items-center gap-2 px-3 py-3 text-left hover:bg-gray-50"
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900">{row.day}</p>
                              <p className={`text-xs ${row.closed ? 'text-gray-400 italic' : 'text-gray-500'}`}>
                                {row.closed ? 'Closed all day' : `${row.openTime} – ${row.closeTime}`}
                              </p>
                            </div>
                          </button>
                          {expanded ? (
                            <div className="px-3 pb-3 pt-1 border-t border-gray-200 space-y-3">
                              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={row.closed}
                                  onChange={(e) =>
                                    setEditOpeningHours((prev) =>
                                      prev.map((h, idx) =>
                                        idx === i ? { ...h, closed: e.target.checked } : h
                                      )
                                    )
                                  }
                                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                Closed all day
                              </label>
                              {!row.closed ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-gray-500">Opens</label>
                                    <input
                                      type="time"
                                      value={row.openTime}
                                      onChange={(e) =>
                                        setEditOpeningHours((prev) =>
                                          prev.map((h, idx) =>
                                            idx === i ? { ...h, openTime: e.target.value } : h
                                          )
                                        )
                                      }
                                      className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Closes</label>
                                    <input
                                      type="time"
                                      value={row.closeTime}
                                      onChange={(e) =>
                                        setEditOpeningHours((prev) =>
                                          prev.map((h, idx) =>
                                            idx === i ? { ...h, closeTime: e.target.value } : h
                                          )
                                        )
                                      }
                                      className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={updateMutation.isPending} className="flex-1 px-5 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50">
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="px-5 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 animate-slide-up relative">
            <button type="button" onClick={() => setConfirmDelete(null)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <p className="text-gray-900 font-medium pr-8">Remove &quot;{confirmDelete.name}&quot;?</p>
            <p className="text-sm text-gray-500 mt-1">This outlet will be deactivated.</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => deleteMutation.mutate(confirmDelete._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Remove
              </button>
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
