import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Copy, X } from 'lucide-react';
import { useOutletStore } from '@/stores/outletStore';
import { vendorApi, type VendorType } from '@/api/vendor';
import { getApiErrorMessage } from '@/api/auth';
import { SearchableSelect } from '@/components/SearchableSelect';

type SelectableVendor = {
  contactId: string;
  name: string;
  typeName: string;
  phones: string[];
  note?: string | null;
};

type Props = {
  open: boolean;
  sourceOutletId: string;
  types: VendorType[];
  onClose: () => void;
  onSuccess?: () => void;
};

function flattenVendors(types: VendorType[]): SelectableVendor[] {
  const rows: SelectableVendor[] = [];
  for (const type of types) {
    for (const vendor of type.vendors || []) {
      rows.push({
        contactId: vendor._id,
        name: vendor.name,
        typeName: type.name,
        phones: vendor.phones || [],
        note: vendor.note,
      });
    }
  }
  return rows.sort((a, b) => {
    const typeCmp = a.typeName.localeCompare(b.typeName);
    if (typeCmp !== 0) return typeCmp;
    return a.name.localeCompare(b.name);
  });
}

export function CopyVendorsToOutletModal({ open, sourceOutletId, types, onClose, onSuccess }: Props) {
  const { outlets } = useOutletStore();
  const [targetOutletId, setTargetOutletId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const vendors = useMemo(() => flattenVendors(types), [types]);
  const allSelected = vendors.length > 0 && selectedIds.length === vendors.length;
  const someSelected = selectedIds.length > 0 && !allSelected;
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTargetOutletId('');
    setSelectedIds([]);
  }, [open, sourceOutletId]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected, selectedIds.length]);

  const outletOptions = useMemo(
    () =>
      outlets
        .filter((o) => o._id !== sourceOutletId)
        .map((o) => ({ value: o._id, label: o.name })),
    [outlets, sourceOutletId]
  );

  const selectedOutletName = outletOptions.find((o) => o.value === targetOutletId)?.label;

  const toggleVendor = (contactId: string) => {
    setSelectedIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : vendors.map((v) => v.contactId));
  };

  const copyMutation = useMutation({
    mutationFn: async () => {
      if (!targetOutletId) throw new Error('Select a target outlet');
      if (selectedIds.length === 0) throw new Error('Select at least one vendor');
      return vendorApi.copyToOutlet(sourceOutletId, {
        targetOutletId,
        contactIds: selectedIds,
      });
    },
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm">
      <div className="relative my-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl max-h-[90vh]">
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
            <h2 className="text-xl font-semibold text-gray-900">Copy vendors to other outlet</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Select vendors from this outlet and copy their details to another outlet. Vendor categories are
            created at the target outlet when needed.
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
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
                  onChange={setTargetOutletId}
                  options={outletOptions}
                  placeholder="Select outlet…"
                />
                {selectedOutletName ? (
                  <p className="mt-1.5 text-xs text-emerald-700">
                    Copying to: <span className="font-medium">{selectedOutletName}</span>
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Vendors to copy</label>

            {vendors.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No vendor contacts in this outlet yet. Add vendors before copying.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-800">
                      Select all vendors
                      <span className="ml-1 font-normal text-gray-500">({vendors.length})</span>
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="shrink-0 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
                  >
                    {allSelected ? 'Clear selection' : 'Select all'}
                  </button>
                </div>

                <div className="max-h-72 space-y-0 divide-y divide-slate-100 overflow-y-auto p-1">
                  {vendors.map((vendor) => {
                    const checked = selectedIds.includes(vendor.contactId);
                    return (
                      <label
                        key={vendor.contactId}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition ${
                          checked ? 'bg-emerald-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleVendor(vendor.contactId)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900">{vendor.name}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              {vendor.typeName}
                            </span>
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            {(vendor.phones || []).join(' · ') || 'No phone'}
                            {vendor.note ? ` · ${vendor.note}` : ''}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {vendors.length > 0 ? (
              <p className="mt-2 text-xs text-gray-500">
                {selectedIds.length} of {vendors.length} selected
              </p>
            ) : null}
          </div>

          {copyMutation.isError ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {getApiErrorMessage(copyMutation.error)}
            </p>
          ) : null}
        </div>

        <div className="flex gap-3 border-t border-slate-100 p-4">
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
              copyMutation.isPending ||
              !targetOutletId ||
              outletOptions.length === 0 ||
              selectedIds.length === 0
            }
            onClick={() => copyMutation.mutate()}
            className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {copyMutation.isPending ? 'Copying…' : `Copy ${selectedIds.length || ''} vendor${selectedIds.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
