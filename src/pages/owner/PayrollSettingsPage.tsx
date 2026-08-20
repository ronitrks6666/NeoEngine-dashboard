import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import type { PayrollSettings } from '@/api/owner';
import { payrollApi } from '@/api/payroll';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Wallet, Save, Info, RefreshCcw, AlertTriangle } from 'lucide-react';

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
  const [saveMessage, setSaveMessage] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);

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

  const lateRulesDirty = useMemo(() => {
    const a = loadedSettings?.lateArrivalRules;
    const b = settings.lateArrivalRules;
    return (
      !!b?.enabled !== !!a?.enabled ||
      (b?.lateThresholdMinutes ?? 15) !== (a?.lateThresholdMinutes ?? 15) ||
      (b?.noShowPayCutDays ?? 2) !== (a?.noShowPayCutDays ?? 2)
    );
  }, [loadedSettings, settings]);

  const setLateRule = <K extends keyof NonNullable<PayrollSettings['lateArrivalRules']>>(
    key: K,
    val: NonNullable<PayrollSettings['lateArrivalRules']>[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      lateArrivalRules: {
        ...(prev.lateArrivalRules || {}),
        [key]: val,
      },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: (applyFrom?: 'next_payroll_month' | 'current_and_next') =>
      payrollApi.updatePayrollSettings(selectedOutletId!, settings, applyFrom ? { lateRulesApplyFrom: applyFrom } : undefined),
    onSuccess: (res) => {
      const savedSettings = res.data?.settings ?? settings;
      setSettings(savedSettings);
      queryClient.setQueryData(['payroll-settings', selectedOutletId], savedSettings);
      queryClient.invalidateQueries({ queryKey: ['owner-outlets'] });
      setSaveMessage(res.message || 'Payroll settings updated.');
      setSaved(true);
      setShowApplyModal(false);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const handleSaveClick = () => {
    if (settings.lateArrivalRules?.enabled && lateRulesDirty) {
      setShowApplyModal(true);
      return;
    }
    saveMutation.mutate(undefined);
  };

  const handleApplyFrom = (mode: 'next_payroll_month' | 'current_and_next') => {
    saveMutation.mutate(mode);
  };

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
          onClick={handleSaveClick}
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

              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Auto-lock payroll period</p>
                  <p className="text-xs text-gray-500 mt-0.5">Enable scheduled lock readiness setting for this outlet</p>
                </div>
                <Toggle checked={!!settings.autoLockEnabled} onChange={(v) => set('autoLockEnabled', v)} id="auto-lock-enabled" />
              </div>

              {settings.autoLockEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Lock day offset after period end</label>
                  <NumberInput
                    value={settings.lockDayOffset}
                    onChange={(v) => set('lockDayOffset', v)}
                    placeholder="e.g. 0"
                    min={0}
                    max={31}
                  />
                  <p className="mt-1 text-xs text-gray-500">0 means lock on period end day, 1 means next day, and so on.</p>
                </div>
              )}
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

          {/* Adjustment approvals */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900">Adjustment approvals</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Enable maker-checker for adjustments</p>
                  <p className="text-xs text-gray-500 mt-0.5">High-value bonus/deduction/advance entries require approval before payroll impact</p>
                </div>
                <Toggle
                  checked={!!settings.adjustmentApprovalEnabled}
                  onChange={(v) => set('adjustmentApprovalEnabled', v)}
                  id="adjustment-approval-enabled"
                />
              </div>
              {settings.adjustmentApprovalEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Approval threshold amount (₹)</label>
                  <NumberInput
                    value={settings.adjustmentApprovalThresholdAmount}
                    onChange={(v) => set('adjustmentApprovalThresholdAmount', v)}
                    placeholder="e.g. 5000"
                    min={0}
                    max={10000000}
                  />
                  <p className="mt-1 text-xs text-gray-500">Adjustments at or above this amount become pending until approved.</p>
                </div>
              )}
            </div>
          </div>

          {/* Compliance defaults */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900">Compliance defaults</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Enable compliance exports</p>
                  <p className="text-xs text-gray-500 mt-0.5">Turns on PF/ESI/PT/TDS calculation parameters for export outputs</p>
                </div>
                <Toggle checked={!!settings.complianceEnabled} onChange={(v) => set('complianceEnabled', v)} id="compliance-enabled" />
              </div>

              {settings.complianceEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">PF Enabled</p>
                        <Toggle checked={!!settings.pfEnabled} onChange={(v) => set('pfEnabled', v)} id="pf-enabled" />
                      </div>
                      {settings.pfEnabled && (
                        <div className="mt-2">
                          <label className="block text-xs text-gray-600 mb-1">PF employee rate (%)</label>
                          <NumberInput value={settings.pfEmployeeRatePct} onChange={(v) => set('pfEmployeeRatePct', v)} min={0} max={100} step={0.01} />
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">ESI Enabled</p>
                        <Toggle checked={!!settings.esiEnabled} onChange={(v) => set('esiEnabled', v)} id="esi-enabled" />
                      </div>
                      {settings.esiEnabled && (
                        <div className="mt-2 space-y-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">ESI employee rate (%)</label>
                            <NumberInput value={settings.esiEmployeeRatePct} onChange={(v) => set('esiEmployeeRatePct', v)} min={0} max={100} step={0.01} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">ESI wage limit (₹)</label>
                            <NumberInput value={settings.esiWageLimit} onChange={(v) => set('esiWageLimit', v)} min={0} max={1000000} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Professional Tax Enabled</p>
                        <Toggle checked={!!settings.professionalTaxEnabled} onChange={(v) => set('professionalTaxEnabled', v)} id="pt-enabled" />
                      </div>
                      {settings.professionalTaxEnabled && (
                        <div className="mt-2">
                          <label className="block text-xs text-gray-600 mb-1">Monthly PT amount (₹)</label>
                          <NumberInput value={settings.professionalTaxMonthlyAmount} onChange={(v) => set('professionalTaxMonthlyAmount', v)} min={0} max={100000} />
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">TDS Enabled</p>
                        <Toggle checked={!!settings.tdsEnabled} onChange={(v) => set('tdsEnabled', v)} id="tds-enabled" />
                      </div>
                      {settings.tdsEnabled && (
                        <div className="mt-2">
                          <label className="block text-xs text-gray-600 mb-1">TDS rate (%)</label>
                          <NumberInput value={settings.tdsRatePct} onChange={(v) => set('tdsRatePct', v)} min={0} max={100} step={0.01} />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Late arrival / no-show rules */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900">Late arrival &amp; attendance penalties</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Strict late-coming rules</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Auto half-day for late punch-in; extra pay cut for no-show on scheduled work days
                  </p>
                </div>
                <Toggle
                  checked={!!settings.lateArrivalRules?.enabled}
                  onChange={(v) => setLateRule('enabled', v)}
                  id="late-rules-enabled"
                />
              </div>

              {settings.lateArrivalRules?.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Late threshold (minutes) → half day
                    </label>
                    <NumberInput
                      value={settings.lateArrivalRules?.lateThresholdMinutes ?? 15}
                      onChange={(v) => setLateRule('lateThresholdMinutes', v ?? 15)}
                      placeholder="15"
                      min={1}
                      max={180}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      If staff punches in this many minutes after expected time, half-day pay unit is applied.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      No-show pay cut (days)
                    </label>
                    <NumberInput
                      value={settings.lateArrivalRules?.noShowPayCutDays ?? 2}
                      onChange={(v) => setLateRule('noShowPayCutDays', v ?? 2)}
                      placeholder="2"
                      min={0}
                      max={10}
                      step={1}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Extra day-units deducted when a staff member does not punch in on a scheduled work day.
                    </p>
                  </div>
                  {settings.lateArrivalRules?.effectiveFrom ? (
                    <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                      Rules active from{' '}
                      {new Date(settings.lateArrivalRules.effectiveFrom).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {settings.lateArrivalRules.effectiveFromMode === 'current_and_next'
                        ? ' (current payroll month)'
                        : settings.lateArrivalRules.effectiveFromMode === 'next_payroll_month'
                          ? ' (next payroll month)'
                          : ''}
                      .
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">Changes to the pay cycle will take effect from the next cycle. In-progress cycles are not affected.</p>
          </div>

          {saveMessage && saved && (
            <p className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm border border-emerald-100">{saveMessage}</p>
          )}

          {saveMutation.isError && (
            <p className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
              {getApiErrorMessage(saveMutation.error)}
            </p>
          )}
        </div>
      )}

      {showApplyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">When should these rules apply?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Late arrival and no-show penalties will affect payroll day-units. Choose the start month.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleApplyFrom('next_payroll_month')}
                disabled={saveMutation.isPending}
                className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
              >
                <p className="font-semibold text-gray-900">From next payroll month</p>
                <p className="text-xs text-gray-500 mt-0.5">Current cycle stays unchanged (recommended)</p>
              </button>
              <button
                type="button"
                onClick={() => handleApplyFrom('current_and_next')}
                disabled={saveMutation.isPending}
                className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 transition-colors"
              >
                <p className="font-semibold text-gray-900">Include this month and next</p>
                <p className="text-xs text-gray-500 mt-0.5">Apply from the start of the current payroll period</p>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="mt-4 w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
