import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ownerApi } from '@/api/owner';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';

function resolveLogoSrc(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/api\/?$/, '');
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export function OwnerBrandSettingsCard() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const { data: brand, isLoading } = useQuery({
    queryKey: ['owner-brand'],
    queryFn: () => ownerApi.getBrand(),
  });

  useEffect(() => {
    setNameDraft(brand?.displayName ?? '');
    setLogoUrl(brand?.logoUrl ?? '');
  }, [brand?.displayName, brand?.logoUrl]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => ownerApi.uploadBrandLogo(file),
    onSuccess: (url) => setLogoUrl(url),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      ownerApi.updateBrand({
        brandDisplayName: nameDraft.trim() || null,
        brandLogoUrl: logoUrl.trim() || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['owner-brand'] });
    },
  });

  const preview = resolveLogoSrc(logoUrl);

  if (isLoading) {
    return (
      <div className="mb-6 flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <section className="mb-8 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Brand logo (all outlets)</h2>
      <p className="mt-1 text-sm text-gray-500">
        Shown beside neoEngine for staff and managers — e.g. neoEngine | PIRO
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand name</label>
          <input
            type="text"
            maxLength={80}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="e.g. PIRO"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/50 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-60"
          >
            {uploadMutation.isPending ? (
              '…'
            ) : preview ? (
              <img src={preview} alt="" className="h-16 w-16 object-contain" />
            ) : (
              '+ Logo'
            )}
          </button>
          {preview ? (
            <button
              type="button"
              onClick={() => setLogoUrl('')}
              className="mt-2 text-xs text-red-600 hover:underline"
            >
              Remove logo
            </button>
          ) : null}
        </div>
      </div>

      {uploadMutation.isError ? (
        <p className="mt-2 text-sm text-red-600">{getApiErrorMessage(uploadMutation.error)}</p>
      ) : null}
      {saveMutation.isError ? (
        <p className="mt-2 text-sm text-red-600">{getApiErrorMessage(saveMutation.error)}</p>
      ) : null}
      {saveMutation.isSuccess ? (
        <p className="mt-2 text-sm text-teal-700">Brand saved for all outlets.</p>
      ) : null}

      <button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="mt-4 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {saveMutation.isPending ? 'Saving…' : 'Save brand'}
      </button>
    </section>
  );
}
