import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ownerApi, type Outlet } from '@/api/owner';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AddressSearchInput } from '@/components/AddressSearchInput';
import { MapPin, Store, Phone, Locate, X } from 'lucide-react';

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
  phone: z.string().min(1, 'Phone required'),
});

const editSchema = createSchema;

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema> & { geofence?: { latitude: number; longitude: number; radius: number } };

interface CreateOutletState {
  geofenceLat: string;
  geofenceLng: string;
  geofenceRadius: string;
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
  const queryClient = useQueryClient();

  const { data: outlets = [], isLoading } = useQuery({
    queryKey: ['owner-outlets'],
    queryFn: ownerApi.getOutlets,
  });

  const createMutation = useMutation({
    mutationFn: ownerApi.createOutlet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-outlets'] });
      setShowCreate(false);
      createForm.reset();
      setCreateGeofence({ geofenceLat: '', geofenceLng: '', geofenceRadius: '100' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EditForm> }) => ownerApi.updateOutlet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-outlets'] });
      setEditing(null);
      editForm.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ownerApi.deleteOutlet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-outlets'] });
      setConfirmDelete(null);
    },
  });

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', address: '', phone: '' },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', address: '', phone: '' },
  });

  const openEdit = (o: Outlet) => {
    setEditing(o);
    editForm.reset({ name: o.name, address: o.address ?? '', phone: o.phone ?? '' });
    const g = o.geofence;
    setEditGeofence({
      geofenceLat: g?.latitude?.toString() ?? '',
      geofenceLng: g?.longitude?.toString() ?? '',
      geofenceRadius: g?.radius?.toString() ?? '100',
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outlets</h1>
          <p className="text-gray-500 mt-0.5">Your restaurant or retail locations</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2 w-fit"
        >
          <span>+</span> Create outlet
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in-stagger">
          {outlets.map((o) => (
            <div key={o._id} className="group rounded-2xl border border-gray-200 p-5 card-hover bg-white overflow-hidden">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center text-xl font-bold text-teal-600">
                  🏪
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(o)}
                    className="p-2 rounded-lg hover:bg-teal-50 text-gray-500 hover:text-teal-600 transition-colors"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setConfirmDelete(o)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                    title="Remove"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <p className="font-semibold text-gray-900 truncate">{o.name}</p>
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{o.address || '-'}</p>
              <p className="text-sm text-gray-500 mt-1">{o.phone || '-'}</p>
            </div>
          ))}
        </div>
      )}

      {outlets.length === 0 && !isLoading && (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-6xl mb-4 opacity-30">🏪</div>
          <p className="text-gray-500">No outlets yet</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 text-teal-600 hover:text-teal-700 font-medium">
            Create your first outlet
          </button>
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
                  <p className="text-teal-100 text-sm mt-0.5">Add a new location with map search</p>
                </div>
              </div>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {createMutation.isError && (
                <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{getApiErrorMessage(createMutation.error)}</p>
              )}
              <form
                onSubmit={createForm.handleSubmit((d) => {
                  const geofence =
                    createGeofence.geofenceLat &&
                    createGeofence.geofenceLng &&
                    createGeofence.geofenceRadius &&
                    !isNaN(parseFloat(createGeofence.geofenceLat)) &&
                    !isNaN(parseFloat(createGeofence.geofenceLng)) &&
                    !isNaN(parseFloat(createGeofence.geofenceRadius))
                      ? {
                          latitude: parseFloat(createGeofence.geofenceLat),
                          longitude: parseFloat(createGeofence.geofenceLng),
                          radius: parseFloat(createGeofence.geofenceRadius),
                        }
                      : undefined;
                  createMutation.mutate({ ...d, geofence });
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
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...createForm.register('phone')}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-colors"
                      placeholder="10-digit contact number"
                    />
                  </div>
                  {createForm.formState.errors.phone && <p className="text-red-600 text-sm mt-1">{createForm.formState.errors.phone.message}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto animate-slide-up overflow-hidden border border-gray-100 relative">
            <button type="button" onClick={() => setEditing(null)} className="absolute top-4 right-4 p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors z-10" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-6 py-5">
              <h2 className="text-xl font-bold text-white">Edit outlet</h2>
              <p className="text-teal-100 text-sm mt-0.5">{editing.name}</p>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {updateMutation.isError && (
                <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{getApiErrorMessage(updateMutation.error)}</p>
              )}
              <form
                onSubmit={editForm.handleSubmit((d) => {
                  const geofence =
                    editGeofence.geofenceLat &&
                    editGeofence.geofenceLng &&
                    editGeofence.geofenceRadius &&
                    !isNaN(parseFloat(editGeofence.geofenceLat)) &&
                    !isNaN(parseFloat(editGeofence.geofenceLng)) &&
                    !isNaN(parseFloat(editGeofence.geofenceRadius))
                      ? {
                          latitude: parseFloat(editGeofence.geofenceLat),
                          longitude: parseFloat(editGeofence.geofenceLng),
                          radius: parseFloat(editGeofence.geofenceRadius),
                        }
                      : undefined;
                  updateMutation.mutate({ id: editing._id, data: { ...d, geofence } });
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
                  {editForm.watch('address') && !editGeofence.geofenceLat && (
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
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input {...editForm.register('phone')} className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white" />
                  </div>
                  {editForm.formState.errors.phone && <p className="text-red-600 text-sm mt-1">{editForm.formState.errors.phone.message}</p>}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={updateMutation.isPending} className="flex-1 px-5 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setEditing(null)} className="px-5 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
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
