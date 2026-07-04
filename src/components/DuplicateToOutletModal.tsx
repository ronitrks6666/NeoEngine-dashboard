import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Copy, Users, UserCog } from 'lucide-react';
import { useOutletStore } from '@/stores/outletStore';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { SearchableSelect } from '@/components/SearchableSelect';
import { MultiSearchableSelect } from '@/components/MultiSearchableSelect';
import { duplicateItemsToOutlet } from '@/lib/duplicateToOutlet';

export type DuplicateToOutletTarget = {
  kind: 'task' | 'sop';
  id: string;
  title: string;
  sourceOutletId: string;
};

type Props = {
  /** Single-item transfer (legacy) */
  target?: DuplicateToOutletTarget | null;
  /** Batch transfer — takes precedence when set */
  targets?: DuplicateToOutletTarget[] | null;
  onClose: () => void;
  onSuccess?: () => void;
};

export function DuplicateToOutletModal({ target, targets, onClose, onSuccess }: Props) {
  const { outlets } = useOutletStore();
  const [targetOutletId, setTargetOutletId] = useState('');
  const [assignToType, setAssignToType] = useState<'role' | 'staff'>('staff');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [isShared, setIsShared] = useState(false);

  const items = useMemo(() => {
    if (targets?.length) return targets;
    if (target) return [target];
    return [];
  }, [target, targets]);

  const open = items.length > 0;
  const isBatch = items.length > 1;
  const sourceOutletId = items[0]?.sourceOutletId ?? '';
  const batchKey = items.map((i) => i.id).join(',');

  useEffect(() => {
    if (!open) return;
    setTargetOutletId('');
    setAssignToType('staff');
    setRoleIds([]);
    setStaffIds([]);
    setIsShared(false);
  }, [open, batchKey]);

  const outletOptions = useMemo(
    () =>
      outlets
        .filter((o) => o._id !== sourceOutletId)
        .map((o) => ({ value: o._id, label: o.name })),
    [outlets, sourceOutletId]
  );

  const { data: rolesData } = useQuery({
    queryKey: ['parent-roles'],
    queryFn: () => employeeApi.getParentRoles(),
    enabled: open,
  });

  const roleOptions = useMemo(
    () =>
      (rolesData?.data?.parentRoles ?? rolesData?.parentRoles ?? []).map(
        (r: { _id: string; name: string }) => ({ value: r._id, label: r.name })
      ),
    [rolesData]
  );

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['duplicate-outlet-staff', targetOutletId],
    queryFn: () => employeeApi.getMyEmployees({ outletId: targetOutletId, limit: 200 }),
    enabled: open && !!targetOutletId,
  });

  const staffOptions = useMemo(() => {
    const list =
      staffData?.data?.employees ??
      staffData?.employees ??
      (Array.isArray(staffData) ? staffData : []);
    return (list as Array<{
      _id: string;
      name: string;
      activeRoleId?: { name?: string; parentRoleId?: { name?: string } };
    }>).map((e) => {
      const role =
        e.activeRoleId?.parentRoleId?.name || e.activeRoleId?.name || 'Staff';
      return {
        value: e._id,
        label: `${role} — ${e.name}`,
      };
    });
  }, [staffData]);

  const selectedOutletName = outletOptions.find((o) => o.value === targetOutletId)?.label;

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!items.length || !targetOutletId) throw new Error('Select a target outlet');
      if (assignToType === 'staff' && staffIds.length === 0) {
        throw new Error('Select at least one staff member');
      }
      if (assignToType === 'role' && roleIds.length === 0) {
        throw new Error('Select at least one role');
      }
      await duplicateItemsToOutlet(items, {
        targetOutletId,
        assignToType,
        roleIds,
        staffIds,
        isShared,
      });
    },
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  if (!open) return null;

  const kind = items[0]?.kind === 'sop' ? 'SOP' : 'task';
  const actionLabel = isBatch ? `Transfer ${items.length} ${kind}s` : `Duplicate ${kind}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm">
      <div className="relative my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-2 text-gray-400 hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="rounded-t-2xl border-b border-emerald-50 bg-gradient-to-r from-emerald-50/80 to-white p-6 pr-14">
          <div className="flex items-center gap-2 text-emerald-700">
            <Copy className="h-5 w-5" />
            <h2 className="text-xl font-semibold text-gray-900">{actionLabel}</h2>
          </div>
          {isBatch ? (
            <p className="mt-1 text-sm text-gray-500">
              Copy <span className="font-medium text-gray-800">{items.length} items</span> to another
              outlet with the same assignment for each.
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              Copy{' '}
              <span className="font-medium text-gray-800">&quot;{items[0].title}&quot;</span> to another
              outlet and assign there.
            </p>
          )}
          {isBatch && items.length <= 5 ? (
            <ul className="mt-2 list-inside list-disc text-xs text-gray-500">
              {items.map((i) => (
                <li key={i.id} className="truncate">
                  {i.title}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-5 p-6 pb-8">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Target outlet</label>
            {outletOptions.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No other outlets available. Add another outlet first.
              </p>
            ) : (
              <>
                <SearchableSelect
                  value={targetOutletId}
                  onChange={(id) => {
                    setTargetOutletId(id);
                    setStaffIds([]);
                  }}
                  options={outletOptions}
                  placeholder="Select outlet…"
                />
                {selectedOutletName ? (
                  <p className="mt-1.5 text-xs text-emerald-700">
                    Transferring to: <span className="font-medium">{selectedOutletName}</span>
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Assign to</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAssignToType('staff')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${
                  assignToType === 'staff' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Users className="h-4 w-4" />
                Staff
              </button>
              <button
                type="button"
                onClick={() => setAssignToType('role')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${
                  assignToType === 'role' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <UserCog className="h-4 w-4" />
                Role
              </button>
            </div>
          </div>

          {assignToType === 'role' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Roles at target outlet
                <span className="ml-1 font-normal text-gray-400">(select one or more)</span>
              </label>
              <MultiSearchableSelect
                values={roleIds}
                onChange={setRoleIds}
                options={roleOptions}
                placeholder="Search & select roles…"
              />
              {roleIds.length > 1 && items[0]?.kind === 'task' && !isShared && (
                <p className="mt-2 text-xs text-gray-500">
                  Creates a separate copy per role for each selected task.
                </p>
              )}
              {roleIds.length > 0 ? (
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isShared}
                    onChange={(e) => setIsShared(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <span className="font-medium">
                      {items[0]?.kind === 'sop' ? 'Shared SOP' : 'Shared task'}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      Team collaborates on one bundle — anyone in the selected role(s) can complete tasks.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>
          )}

          {assignToType === 'staff' && (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Staff at target outlet
                  {!targetOutletId ? (
                    <span className="ml-1 font-normal text-amber-600">(select outlet first)</span>
                  ) : staffLoading ? (
                    <span className="ml-1 font-normal text-gray-400">(loading…)</span>
                  ) : null}
                </label>
                <MultiSearchableSelect
                  values={staffIds}
                  onChange={setStaffIds}
                  options={staffOptions}
                  placeholder={staffLoading ? 'Loading staff…' : 'Search & select staff…'}
                  disabled={!targetOutletId || staffLoading}
                />
              </div>
              {(items[0]?.kind === 'task' || items[0]?.kind === 'sop') && staffIds.length > 1 ? (
                <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isShared}
                    onChange={(e) => setIsShared(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <span className="font-medium">
                      {items[0]?.kind === 'sop' ? 'Shared SOP' : 'Shared task'}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      One collaborative bundle for all selected staff. Uncheck to create separate copies.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>
          )}

          {duplicateMutation.isError && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {getApiErrorMessage(duplicateMutation.error)}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 px-5 py-3 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                duplicateMutation.isPending ||
                !targetOutletId ||
                outletOptions.length === 0 ||
                (assignToType === 'staff' && staffIds.length === 0) ||
                (assignToType === 'role' && roleIds.length === 0)
              }
              onClick={() => duplicateMutation.mutate()}
              className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {duplicateMutation.isPending ? 'Transferring…' : isBatch ? 'Transfer all' : 'Duplicate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
