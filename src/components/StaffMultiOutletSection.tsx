import { Building2, Shield } from 'lucide-react';
import type { Outlet } from '@/api/owner';

type Props = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  selectedOutletIds: string[];
  onSelectedOutletIdsChange: (ids: string[]) => void;
  primaryOutletId: string;
  outlets: Outlet[];
  permissionMode: 'keep' | 'reset';
  onPermissionModeChange: (mode: 'keep' | 'reset') => void;
  showPermissionChoice: boolean;
  disabled?: boolean;
};

export function StaffMultiOutletSection({
  enabled,
  onEnabledChange,
  selectedOutletIds,
  onSelectedOutletIdsChange,
  primaryOutletId,
  outlets,
  permissionMode,
  onPermissionModeChange,
  showPermissionChoice,
  disabled,
}: Props) {
  const toggleOutlet = (outletId: string) => {
    if (outletId === primaryOutletId) return;
    if (selectedOutletIds.includes(outletId)) {
      onSelectedOutletIdsChange(selectedOutletIds.filter((id) => id !== outletId));
      return;
    }
    onSelectedOutletIdsChange([...selectedOutletIds, outletId]);
  };

  return (
    <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/40 via-white to-white p-4 space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Building2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Multi-outlet access</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Same phone and password works at every selected outlet. Permissions are shared across
            all outlets for this staff member.
          </p>
        </div>
        <div className="flex shrink-0 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onEnabledChange(false)}
            className={`min-w-[3rem] rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              !enabled ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            No
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onEnabledChange(true);
              if (!selectedOutletIds.includes(primaryOutletId)) {
                onSelectedOutletIdsChange([primaryOutletId, ...selectedOutletIds]);
              }
            }}
            className={`min-w-[3rem] rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              enabled ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Yes
          </button>
        </div>
      </div>

      {enabled && (
        <div className="space-y-3 border-t border-emerald-100/90 pt-3 animate-slide-up">
          <p className="text-xs font-medium text-gray-600">Select outlets this staff can access</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {outlets.map((outlet) => {
              const id = String(outlet._id);
              const isPrimary = id === primaryOutletId;
              const checked = selectedOutletIds.includes(id);
              return (
                <label
                  key={id}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                    checked
                      ? 'border-emerald-300 bg-emerald-50/80'
                      : 'border-gray-200 bg-white hover:border-emerald-200'
                  } ${isPrimary ? 'ring-1 ring-emerald-200' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={checked}
                    disabled={disabled || isPrimary}
                    onChange={() => toggleOutlet(id)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 truncate">
                      {outlet.name}
                    </span>
                    {isPrimary ? (
                      <span className="text-[11px] text-emerald-700 font-medium">Primary outlet</span>
                    ) : (
                      <span className="text-[11px] text-gray-500">Additional outlet</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
          {outlets.length < 2 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Create another outlet first to enable multi-outlet access.
            </p>
          )}
        </div>
      )}

      {showPermissionChoice && enabled && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-600" />
            Permissions for this change
          </p>
          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="multiOutletPermMode"
              checked={permissionMode === 'keep'}
              onChange={() => onPermissionModeChange('keep')}
              disabled={disabled}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Keep current permissions</span>
              <span className="block text-xs text-gray-500">
                Same access at every selected outlet (recommended).
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="multiOutletPermMode"
              checked={permissionMode === 'reset'}
              onChange={() => onPermissionModeChange('reset')}
              disabled={disabled}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Reset to staff-only defaults</span>
              <span className="block text-xs text-gray-500">
                Clears custom manager/web permissions. You can set them again in Permissions.
              </span>
            </span>
          </label>
        </div>
      )}
    </section>
  );
}
