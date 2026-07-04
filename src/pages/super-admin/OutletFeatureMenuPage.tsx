import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { adminApi } from '@/api/admin';
import type { FeatureMenuPrefRow } from '@/api/owner';
import { FeatureMenuEditor } from '@/components/FeatureMenuEditor';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function OutletFeatureMenuPage() {
  const { outletId } = useParams<{ outletId: string }>();
  const queryClient = useQueryClient();
  const [webRows, setWebRows] = useState<FeatureMenuPrefRow[]>([]);
  const [mobileRows, setMobileRows] = useState<FeatureMenuPrefRow[]>([]);
  const [dirty, setDirty] = useState(false);

  const queryKey = ['super-admin-outlet-feature-menu', outletId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => adminApi.getOutletFeatureMenu(outletId!),
    enabled: !!outletId,
  });

  useEffect(() => {
    if (!data) return;
    setWebRows(data.webNav.items);
    setMobileRows(data.mobileMore.items);
    setDirty(false);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.updateOutletFeatureMenu(outletId!, {
        webNav: webRows,
        mobileMore: mobileRows,
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
      setWebRows(next.webNav.items);
      setMobileRows(next.mobileMore.items);
      setDirty(false);
    },
  });

  if (!outletId) {
    return <p className="p-6 text-gray-600">Missing outlet.</p>;
  }

  if (isLoading || !data) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="border-b border-emerald-100 bg-white px-6 py-4">
        <Link
          to="/super-admin/outlets"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to outlets
        </Link>
      </div>
      <FeatureMenuEditor
        title={`Menu layout — ${data.outletName}`}
        description="Configure which features appear in this outlet's web sidebar and mobile More menu. Outlet owners cannot change these settings."
        data={data}
        webRows={webRows}
        mobileRows={mobileRows}
        dirty={dirty}
        saving={saveMutation.isPending}
        onWebRowsChange={(rows) => {
          setWebRows(rows);
          setDirty(true);
        }}
        onMobileRowsChange={(rows) => {
          setMobileRows(rows);
          setDirty(true);
        }}
        onSave={() => saveMutation.mutate()}
      />
    </div>
  );
}
