import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminApi, type Owner } from '@/api/admin';
import { getApiErrorMessage } from '@/api/auth';
import { X } from 'lucide-react';
import { zPhone10 } from '@/lib/phoneValidation';

const createSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
  phone: zPhone10,
});

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ImpersonateModal } from '@/components/ImpersonateModal';
import type { Owner as AuthOwner } from '@/types/auth';

type CreateForm = z.infer<typeof createSchema>;

export function OwnersPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [impersonateToken, setImpersonateToken] = useState<string | null>(null);
  const [impersonateOwnerObj, setImpersonateOwnerObj] = useState<AuthOwner | null>(null);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { impersonateAsOwner } = useAuth();

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ['admin-owners'],
    queryFn: adminApi.getOwners,
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createOwner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-owners'] });
      setShowCreate(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; phone: string } }) =>
      adminApi.updateOwner(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-owners'] });
      setEditingOwner(null);
    },
  });

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '', phone: '' },
  });

  const filtered = owners.filter(
    (o) =>
      o.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.email?.toLowerCase().includes(search.toLowerCase()) ||
      o.phone?.includes(search)
  );

  const onSubmit = (data: CreateForm) => {
    createMutation.mutate(data);
  };

  const handleImpersonate = async (ownerId: string) => {
    try {
      setImpersonatingId(ownerId);
      const { token, owner } = await impersonateAsOwner(ownerId);
      setImpersonateToken(token);
      setImpersonateOwnerObj(owner);
    } catch (e: unknown) {
      alert(getApiErrorMessage(e));
    } finally {
      setImpersonatingId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Owners</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
        >
          Create Owner
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name, email, phone..."
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
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Phone</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((o: Owner) => (
                <tr key={o._id}>
                  <td className="px-4 py-2">{o.name}</td>
                  <td className="px-4 py-2">{o.email}</td>
                  <td className="px-4 py-2">{o.phone}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${o.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {o.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setEditingOwner(o)}
                      className="mr-3 text-gray-700 hover:text-gray-900 font-medium text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleImpersonate(o._id)}
                      disabled={impersonatingId === o._id || o.isActive === false}
                      className="text-primary hover:text-primary-dark font-medium text-sm disabled:opacity-50"
                    >
                      {impersonatingId === o._id ? 'Connecting...' : 'Impersonate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-4 text-gray-500">No owners found</p>}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button type="button" onClick={() => setShowCreate(false)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <h2 className="text-lg font-semibold mb-4 pr-8">Create Owner</h2>
            {createMutation.isError && (
              <p className="mb-4 text-red-600 text-sm">{getApiErrorMessage(createMutation.error)}</p>
            )}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input {...form.register('name')} className="w-full px-3 py-2 border rounded" />
                {form.formState.errors.name && <p className="text-red-600 text-sm">{form.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input {...form.register('email')} type="email" className="w-full px-3 py-2 border rounded" />
                {form.formState.errors.email && <p className="text-red-600 text-sm">{form.formState.errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input {...form.register('password')} type="password" className="w-full px-3 py-2 border rounded" />
                {form.formState.errors.password && <p className="text-red-600 text-sm">{form.formState.errors.password.message}</p>}
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

      {editingOwner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button type="button" onClick={() => setEditingOwner(null)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <h2 className="text-lg font-semibold mb-4 pr-8">Edit Owner</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateMutation.mutate({
                  id: editingOwner._id,
                  payload: {
                    name: String(formData.get('name') || '').trim(),
                    phone: String(formData.get('phone') || '').replace(/\D/g, '').slice(-10),
                  },
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input name="name" defaultValue={editingOwner.name} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input name="phone" defaultValue={editingOwner.phone} maxLength={10} className="w-full px-3 py-2 border rounded" />
              </div>
              {updateMutation.isError && (
                <p className="text-red-600 text-sm">{getApiErrorMessage(updateMutation.error)}</p>
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 bg-primary text-white rounded">
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditingOwner(null)} className="px-4 py-2 border rounded">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ImpersonateModal
        isOpen={!!impersonateToken}
        onClose={() => { 
          setImpersonateToken(null); 
          setImpersonateOwnerObj(null); 
          queryClient.invalidateQueries();
        }}
        token={impersonateToken}
        owner={impersonateOwnerObj}
      />
    </div>
  );
}
