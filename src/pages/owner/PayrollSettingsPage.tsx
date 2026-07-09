import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import type { PayrollSettings } from '@/api/owner';
import { payrollApi } from '@/api/payroll';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Wallet, Save, Info, RefreshCcw } from 'lucide-react';

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${checked ? 'bg-emerald-600' : 'bg-gray-200'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

function NumberInput({ value, onChange, placeholder, min, max, step = 1 }: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value ?? ''}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : parseFloat(v));
      }}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
    />
  );
}

export function PayrollSettingsPage() {
  const { selectedOutletId } = useOutletStore();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<PayrollSettings>({});
  const [saved, setSaved] = useState(false);

  const { data: loadedSettings, isLoading } = useQuery({
    queryKey: ['payroll-settings', selectedOutletId],
    queryFn: () => payrollApi.getPayrollSettings(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  useEffect(() => {
    if (!selectedOutletId) {
      setSettings({});
      return;
    }
    if (loadedSettings) {
      setSettings(loadedSettings);
    }
  }, [loadedSettings, selectedOutletId]);

  const saveMutation = useMutation({
    mutationFn: () => payrollApi.updatePayrollSettings(selectedOutletId!, settings),
    onSuccess: (saved) => {
      setSettings(saved);
      queryClient.setQueryData(['payroll-settings', selectedOutletId], saved);
      queryClient.invalidateQueries({ queryKey: ['owner-outlets'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const set = <K extends keyof PayrollSettings>(key: K, val: PayrollSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  if (!selectedOutletId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <p className="text-amber-600">Select an outlet first.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Settings</h1>
          <p className="text-gray-500 mt-1">Configure pay cycle, leaves, and overtime rules for this outlet</p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm shrink-0 ${
            saved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
          }`}
        >
          {saveMutation.isPending ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="space-y-6">
          {/* Pay Cycle */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600" /> Pay Cycle
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cycle Type</label>
                <div className="flex gap-2">
                  {[
                    { value: 'every_x_days', label: 'Every X Days' },
                    { value: 'specific_day_of_month', label: 'Monthly on Day' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('cycleType', opt.value as PayrollSettings['cycleType'])}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        settings.cycleType === opt.value
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {settings.cycleType === 'every_x_days' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cycle Length (days)</label>
                  <NumberInput value={settings.cycleDays} onChange={(v) => set('cycleDays', v)} placeholder="e.g. 30" min={1} max={99} />
                </div>
              )}

              {settings.cycleType === 'specific_day_of_month' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Day of Month (1–28)</label>
                  <NumberInput value={settings.cycleDayOfMonth} onChange={(v) => set('cycleDayOfMonth', v)} placeholder="e.g. 1" min={1} max={28} />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected Work Hours / Day</label>
                <NumberInput value={settings.expectedHoursPerDayDefault} onChange={(v) => set('expectedHoursPerDayDefault', v)} placeholder="e.g. 8" min={1} max={24} step={0.5} />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Minute-based Tracking</p>
                  <p className="text-xs text-gray-500 mt-0.5">Track attendance to the minute instead of whole hours</p>
                </div>
                <Toggle checked={!!settings.minuteBasedTrackingEnabled} onChange={(v) => set('minuteBasedTrackingEnabled', v)} id="minute-tracking" />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Allow Unlimited Work Hours</p>
                  <p className="text-xs text-gray-500 mt-0.5">Don't cap daily hours for payroll calculations</p>
                </div>
                <Toggle checked={!!settings.allowUnlimitedWorkHoursPerDay} onChange={(v) => set('allowUnlimitedWorkHoursPerDay', v)} id="unlimited-hours" />
              </div>
            </div>
          </div>

          {/* Paid Leaves */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900">Paid Leaves</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Enable Paid Leaves</p>
                  <p className="text-xs text-gray-500 mt-0.5">Staff get paid for approved leave days</p>
                </div>
                <Toggle checked={!!settings.paidLeavesEnabled} onChange={(v) => set('paidLeavesEnabled', v)} id="paid-leaves" />
              </div>

              {settings.paidLeavesEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Allowed Paid Leaves per Cycle</label>
                  <NumberInput value={settings.allowedPaidLeavesPerCycle} onChange={(v) => set('allowedPaidLeavesPerCycle', v)} placeholder="e.g. 1" min={0} max={30} />
                </div>
              )}
            </div>
          </div>

          {/* Overtime */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900">Overtime</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Enable Overtime</p>
                  <p className="text-xs text-gray-500 mt-0.5">Allow staff to log and get paid for overtime hours</p>
                </div>
                <Toggle checked={!!settings.overtimeEnabled} onChange={(v) => set('overtimeEnabled', v)} id="overtime-enabled" />
              </div>

              {settings.overtimeEnabled && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Require Approval</p>
                    <p className="text-xs text-gray-500 mt-0.5">Overtime must be approved by manager before payment</p>
                  </div>
                  <Toggle checked={!!settings.overtimeApprovalRequired} onChange={(v) => set('overtimeApprovalRequired', v)} id="overtime-approval" />
                </div>
              )}
            </div>
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">Changes to the pay cycle will take effect from the next cycle. In-progress cycles are not affected.</p>
          </div>

          {saveMutation.isError && (
            <p className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
              Failed to save. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
