import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminApi, type Outlet } from '@/api/admin';
import { getApiErrorMessage } from '@/api/auth';
import { X } from 'lucide-react';
import { SearchableSelect } from '@/components/SearchableSelect';
import { zPhone10 } from '@/lib/phoneValidation';

const createSchema = z.object({
  name: z.string().min(1, 'Name required'),
  address: z.string().min(1, 'Address required'),
  phone: zPhone10,
  ownerId: z.string().min(1, 'Select owner'),
});

type CreateForm = z.infer<typeof createSchema>;

export function OutletsPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: outlets = [], isLoading } = useQuery({
    queryKey: ['admin-outlets'],
    queryFn: adminApi.getOutlets,
  });

  const { data: owners = [] } = useQuery({
    queryKey: ['admin-owners'],
    queryFn: adminApi.getOwners,
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createOutlet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-outlets'] });
      setShowCreate(false);
      form.reset();
    },
  });

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', address: '', phone: '', ownerId: '' },
  });

  const ownerSelectOptions = useMemo(
    () => owners.map((o) => ({ value: o._id, label: o.name })),
    [owners]
  );

  const getOwnerName = (o: Outlet) => {
    const owner = o.ownerId;
    if (typeof owner === 'object' && owner?.name) return owner.name;
    return owner as string;
  };

  const filtered = outlets.filter(
    (o) =>
      o.name?.toLowerCase().includes(search.toLowerCase()) ||
      getOwnerName(o).toLowerCase().includes(search.toLowerCase())
  );

  const onSubmit = (data: CreateForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Outlets</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
        >
          Create Outlet
        </button>
      </div>

      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md mb-4 px-3 py-2 border border-gray-300 rounded-md"
      />

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Address</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Phone</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((o: Outlet) => (
                <tr key={o._id}>
                  <td className="px-4 py-2">{o.name}</td>
                  <td className="px-4 py-2">{o.address || '-'}</td>
                  <td className="px-4 py-2">{o.phone || '-'}</td>
                  <td className="px-4 py-2">{getOwnerName(o)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-4 text-gray-500">No outlets found</p>}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button type="button" onClick={() => setShowCreate(false)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <h2 className="text-lg font-semibold mb-4 pr-8">Create Outlet</h2>
            {createMutation.isError && (
              <p className="mb-4 text-red-600 text-sm">{getApiErrorMessage(createMutation.error)}</p>
            )}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                <SearchableSelect
                  value={form.watch('ownerId') || ''}
                  onChange={(v) => form.setValue('ownerId', v, { shouldValidate: true })}
                  options={ownerSelectOptions}
                  placeholder="Select owner"
                  searchPlaceholder="Search owners…"
                  noOptionsText="No owners"
                  emptyText="No matches"
                />
                {form.formState.errors.ownerId && <p className="text-red-600 text-sm">{form.formState.errors.ownerId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input {...form.register('name')} className="w-full px-3 py-2 border rounded" />
                {form.formState.errors.name && <p className="text-red-600 text-sm">{form.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input {...form.register('address')} className="w-full px-3 py-2 border rounded" />
                {form.formState.errors.address && <p className="text-red-600 text-sm">{form.formState.errors.address.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Controller
                  name="phone"
                  control={form.control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={10}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full px-3 py-2 border rounded tracking-wide"
                      placeholder="10-digit mobile"
                    />
                  )}
                />
                {form.formState.errors.phone && <p className="text-red-600 text-sm">{form.formState.errors.phone.message}</p>}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-white rounded">
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
