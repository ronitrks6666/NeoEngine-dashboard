import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { payrollApi } from '@/api/payroll';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SearchableSelect } from '@/components/SearchableSelect';
import { ListSearchBar } from '@/components/ListSearchBar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { X, Wallet, Loader2, Calendar, Info, TrendingUp, TrendingDown, IndianRupee, ChevronRight, PieChart, FileText } from 'lucide-react';

export function PayrollPage() {
  const { selectedOutletId } = useOutletStore();
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState<{ periodId: string; employeeId: string; employeeName: string } | null>(null);
  const [paymentType, setPaymentType] = useState('salary_payment');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showBreakdown, setShowBreakdown] = useState<any | null>(null);
  const [payrollListSearch, setPayrollListSearch] = useState('');
  const debouncedPayrollSearch = useDebouncedValue(payrollListSearch, 350);
  const queryClient = useQueryClient();

  const { data: periodsData, isLoading } = useQuery({
    queryKey: ['payroll-periods', selectedOutletId],
    queryFn: () => payrollApi.getPeriods(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  const processMutation = useMutation({
    mutationFn: (periodId: string) => payrollApi.processPeriod(selectedOutletId!, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-period'] });
    },
  });

  const lockMutation = useMutation({
    mutationFn: (periodId: string) => payrollApi.lockPeriod(selectedOutletId!, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-period'] });
    },
  });

  const createPeriodMutation = useMutation({
    mutationFn: () => payrollApi.createPeriod(selectedOutletId!, { periodStart: periodStart, periodEnd: periodEnd }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      const newPeriod = data?.data?.period;
      if (newPeriod?._id) setSelectedPeriodId(newPeriod._id);
      setShowCreatePeriod(false);
      setPeriodStart('');
      setPeriodEnd('');
    },
  });

  const paymentMutation = useMutation({
    mutationFn: () => {
      const payload = {
        amount: parseFloat(paymentAmount),
        notes: paymentNotes,
        payrollPeriodId: showAddPayment!.periodId,
      };
      if (paymentType === 'salary_payment') {
        return payrollApi.addPayment(selectedOutletId!, showAddPayment!.employeeId, payload);
      } else {
        return payrollApi.addAdjustment(selectedOutletId!, showAddPayment!.employeeId, { ...payload, type: paymentType });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-period'] });
      setShowAddPayment(null);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentType('salary_payment');
    },
  });

  const { data: empData } = useQuery({
    queryKey: ['my-employees', selectedOutletId],
    queryFn: () =>
      employeeApi.getMyEmployees({
        outletId: selectedOutletId ?? undefined,
        limit: 100,
        includeInactive: true,
      }),
    enabled: !!selectedOutletId && !!showAddPayment,
  });

  const { data: periodDetailData, isLoading: isPeriodDetailLoading } = useQuery({
    queryKey: ['payroll-period', selectedOutletId, selectedPeriodId, debouncedPayrollSearch],
    queryFn: () =>
      payrollApi.getPeriod(selectedOutletId!, selectedPeriodId!, {
        search: debouncedPayrollSearch.trim() || undefined,
      }),
    enabled: !!selectedOutletId && !!selectedPeriodId,
  });

  const periods = periodsData?.data?.periods ?? periodsData?.periods ?? [];
  const payrollPeriodOptions = useMemo(
    () =>
      (periods as { _id: string; periodStart?: string; periodEnd?: string; status?: string }[]).map((p) => ({
        value: p._id,
        label:
          (p.periodStart && p.periodEnd
            ? `${new Date(p.periodStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} — ${new Date(p.periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : 'Period') +
          (p.status !== 'open'
            ? ` · ${p.status === 'paid' ? 'Paid' : p.status === 'locked' ? 'Locked' : 'Processed'}`
            : ''),
      })),
    [periods]
  );
  const employees = empData?.data?.employees ?? [];
  const periodDetail = periodDetailData?.data ?? periodDetailData;
  const periodEmployees = periodDetail?.employees ?? [];
  const periodSummary = periodDetail?.summary ?? {};
  const currentPeriod = periodDetail?.period;

  // Auto-select current cycle (first/most recent period) when page loads
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(periods[0]._id);
    }
  }, [periods, selectedPeriodId]);

  if (!selectedOutletId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <div className="text-center animate-fade-in">
          <p className="text-amber-600 text-lg">Select an outlet first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-500 mt-0.5">Manage pay periods and payments</p>
        </div>
        <button
          onClick={() => setShowCreatePeriod(true)}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2 w-fit"
        >
          <span>+</span> Create period
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : periods.length > 0 ? (
        <>
          {/* Period selector - polished dropdown */}
          <div className="mb-6">
            <div className="inline-flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payroll period</label>
              <div className="flex items-start gap-2 min-w-[280px]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm" title="Selected pay period">
                  <Calendar className="h-5 w-5 text-teal-500" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 min-w-[220px]">
                  <SearchableSelect
                    value={selectedPeriodId ?? ''}
                    onChange={(v) => setSelectedPeriodId(v || null)}
                    options={payrollPeriodOptions}
                    placeholder="Select period"
                    searchPlaceholder="Search periods…"
                    noOptionsText="No periods"
                    emptyText="No matches"
                    className="min-w-[220px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Current cycle details - always visible */}
          {selectedPeriodId && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {isPeriodDetailLoading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
                  <p className="text-sm text-gray-500">Loading period details...</p>
                </div>
              ) : (
              <>
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Period details</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {currentPeriod?.periodStart && currentPeriod?.periodEnd
                      ? `${new Date(currentPeriod.periodStart).toLocaleDateString()} — ${new Date(currentPeriod.periodEnd).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentPeriod?.status === 'open' && (
                    <button
                      onClick={() => processMutation.mutate(selectedPeriodId)}
                      disabled={processMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {processMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {processMutation.isPending ? 'Processing...' : 'Process'}
                    </button>
                  )}
                  {currentPeriod?.status === 'processing' && (
                    <>
                      <button
                        onClick={() => lockMutation.mutate(selectedPeriodId)}
                        disabled={lockMutation.isPending}
                        className="px-4 py-2 rounded-xl border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-50 flex items-center gap-2"
                      >
                        {lockMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {lockMutation.isPending ? 'Locking...' : 'Lock'}
                      </button>
                      <button
                        onClick={() => setShowAddPayment({ periodId: selectedPeriodId, employeeId: '', employeeName: '' })}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                      >
                        Add payment
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label htmlFor="payroll-staff-search" className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Filter staff in this period
                  </label>
                  <ListSearchBar
                    value={payrollListSearch}
                    onChange={setPayrollListSearch}
                    placeholder="Search by name or phone"
                    className="max-w-md"
                    id="payroll-staff-search"
                    aria-label="Search payroll staff"
                  />
                </div>
                {periodSummary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase">Staff</p>
                      <p className="text-xl font-bold text-gray-900">{periodSummary.totalEmployees ?? 0}</p>
                    </div>
                    <div className="bg-teal-50 rounded-xl p-4">
                      <p className="text-xs font-medium text-teal-600 uppercase">Total payable</p>
                      <p className="text-xl font-bold text-teal-700">₹{(periodSummary.totalPayrollAmount ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <p className="text-xs font-medium text-emerald-600 uppercase">Paid</p>
                      <p className="text-xl font-bold text-emerald-700">₹{(periodSummary.totalPaidAmount ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4">
                      <p className="text-xs font-medium text-amber-600 uppercase">Remaining</p>
                      <p className="text-xl font-bold text-amber-700">₹{(periodSummary.totalRemainingAmount ?? 0).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 font-medium text-gray-700">Staff</th>
                        <th className="text-right py-3 font-medium text-gray-700">Earned</th>
                        <th className="text-right py-3 font-medium text-gray-700">Bonus/Ded</th>
                        <th className="text-right py-3 font-medium text-gray-700">Advance</th>
                        <th className="text-right py-3 font-medium text-gray-700">Net Payable</th>
                        <th className="text-right py-3 font-medium text-gray-700">Paid</th>
                        <th className="text-right py-3 font-medium text-gray-700">Remaining</th>
                        <th className="text-center py-3 font-medium text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodEmployees.map((emp: any) => (
                        <tr key={typeof emp.employeeId === 'object' ? emp.employeeId?._id : emp.employeeId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-gray-900">{emp.name}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{emp.role}</p>
                          </td>
                          <td className="text-right py-3 text-gray-600">
                            <p className="font-medium">₹{(emp.baseSalaryEarned ?? emp.earned ?? 0).toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400">{(emp.totalHoursWorked ?? 0).toFixed(1)}h worked</p>
                          </td>
                          <td className="text-right py-3">
                            <div className="flex flex-col items-end">
                              {(emp.bonuses ?? 0) > 0 && <span className="text-[10px] text-emerald-600 font-bold">+{emp.bonuses} bonus</span>}
                              {(emp.deductions ?? 0) > 0 && <span className="text-[10px] text-red-600 font-bold">-{emp.deductions} ded</span>}
                              {!(emp.bonuses) && !(emp.deductions) && <span className="text-gray-400">—</span>}
                            </div>
                          </td>
                          <td className="text-right py-3 text-gray-600">
                            <p className="font-medium">₹{(emp.advances ?? emp.advanceGiven ?? 0).toLocaleString()}</p>
                            {(emp.advanceDeductions ?? emp.advanceDeducted ?? 0) > 0 && (
                              <p className="text-[10px] text-amber-600">Ded: ₹{(emp.advanceDeductions ?? emp.advanceDeducted).toLocaleString()}</p>
                            )}
                          </td>
                          <td className="text-right py-3 font-bold text-gray-900">₹{(emp.netPayable ?? 0).toLocaleString()}</td>
                          <td className="text-right py-3 text-emerald-600 font-semibold">₹{(emp.paidAmount ?? emp.paid ?? 0).toLocaleString()}</td>
                          <td className="text-right py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${ (emp.remainingAmount ?? emp.remaining ?? 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700' }`}>
                              ₹{(emp.remainingAmount ?? emp.remaining ?? 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="text-center py-3">
                            <button
                              onClick={() => setShowBreakdown(emp)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-teal-600 transition-colors"
                              title="View details"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {periodEmployees.length === 0 && (
                  <p className="text-center py-8 text-gray-500">
                    {debouncedPayrollSearch.trim()
                      ? 'No staff match your search.'
                      : 'No staff data. Process the period first.'}
                  </p>
                )}
              </div>
              </>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto mb-4 opacity-50">
            <Wallet className="h-8 w-8 text-teal-600" />
          </div>
          <p className="text-gray-500">No pay periods yet</p>
          <button onClick={() => setShowCreatePeriod(true)} className="mt-4 text-teal-600 hover:text-teal-700 font-medium">
            Create your first period
          </button>
        </div>
      )}

      {(processMutation.isError || lockMutation.isError || paymentMutation.isError) && (
        <p className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
          {getApiErrorMessage(processMutation.error ?? lockMutation.error ?? paymentMutation.error)}
        </p>
      )}

      {/* Create period modal */}
      {showCreatePeriod && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 animate-slide-up relative">
            <div className="p-6 border-b border-gray-100 pr-12">
              <h2 className="text-xl font-semibold text-gray-900">Create pay period</h2>
              <p className="text-sm text-gray-500 mt-0.5">Define start and end dates</p>
            </div>
            <button type="button" onClick={() => setShowCreatePeriod(false)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => createPeriodMutation.mutate()}
                  disabled={createPeriodMutation.isPending || !periodStart || !periodEnd}
                  className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createPeriodMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {createPeriodMutation.isPending ? 'Creating...' : 'Create'}
                </button>
                <button onClick={() => setShowCreatePeriod(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
      {/* Add transaction modal */}
      {showAddPayment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-slide-up relative overflow-hidden">
            <div className="p-6 border-b border-gray-100 pr-12">
              <h2 className="text-xl font-bold text-gray-900">Add Transaction</h2>
              <p className="text-sm text-gray-500 mt-0.5">Record salary, advance, or adjustment</p>
            </div>
            <button type="button" onClick={() => { setShowAddPayment(null); setPaymentAmount(''); setPaymentNotes(''); }} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="p-6">
              {!showAddPayment.employeeId ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {employees.map((e: any) => (
                    <button
                      key={e._id}
                      onClick={() => setShowAddPayment({ ...showAddPayment, employeeId: e._id, employeeName: e.name })}
                      className="flex items-center justify-between w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:bg-teal-50 hover:border-teal-200 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs">
                          {e.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-700">{e.name}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-teal-500" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                      {showAddPayment.employeeName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{showAddPayment.employeeName}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Payroll Transaction</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'salary_payment', label: 'Salary Pay', icon: Wallet },
                          { id: 'advance', label: 'Advance', icon: TrendingUp },
                          { id: 'bonus', label: 'Bonus', icon: TrendingUp },
                          { id: 'deduction', label: 'Deduction', icon: TrendingDown },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setPaymentType(t.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                              paymentType === t.id ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
                            }`}
                          >
                            <t.icon className="h-3.5 w-3.5" />
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Amount (₹)</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          placeholder="0.00"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Notes (Optional)</label>
                      <input
                        type="text"
                        placeholder="Add a remark..."
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => paymentMutation.mutate()}
                      disabled={paymentMutation.isPending || !paymentAmount}
                      className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-teal-200"
                    >
                      {paymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {paymentMutation.isPending ? 'Processing...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setShowAddPayment({ ...showAddPayment, employeeId: '', employeeName: '' })}
                      className="px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Modal */}
      {showBreakdown && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-slide-up overflow-hidden relative">
            <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white relative">
              <button 
                onClick={() => setShowBreakdown(null)} 
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-200/50 text-gray-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-teal-200">
                  {showBreakdown.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{showBreakdown.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-lg bg-teal-100 text-teal-700 text-[10px] font-bold uppercase tracking-widest">{showBreakdown.role}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500 font-medium">{showBreakdown.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <PieChart className="h-3.5 w-3.5" /> Earnings Breakdown
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center group">
                    <span className="text-gray-600 font-medium">Base Salary (Earned)</span>
                    <span className="font-bold text-gray-900 group-hover:text-teal-600 transition-colors">₹{(showBreakdown.baseSalaryEarned ?? showBreakdown.earned ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="text-gray-600 font-medium">Overtime Pay</span>
                    <span className="font-bold text-emerald-600">₹{(showBreakdown.overtimeEarned ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <span className="text-gray-600 font-medium">Bonuses</span>
                    <span className="font-bold text-emerald-600">₹{(showBreakdown.bonuses ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-dashed border-gray-200 flex justify-between items-center">
                    <span className="text-gray-900 font-bold">Gross Earnings</span>
                    <span className="text-xl font-black text-gray-900">₹{(showBreakdown.grossEarned ?? (showBreakdown.earned + showBreakdown.overtimeEarned + showBreakdown.bonuses)).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <TrendingDown className="h-3.5 w-3.5" /> Deductions & Adjustments
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Fines / Deductions</span>
                    <span className="font-bold text-red-600">- ₹{(showBreakdown.deductions ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Advance Recovery</span>
                    <span className="font-bold text-amber-600">- ₹{(showBreakdown.advanceDeductions ?? showBreakdown.advanceDeducted ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-dashed border-gray-200 flex justify-between items-center">
                    <span className="text-gray-900 font-bold italic">Net Payable</span>
                    <span className="text-xl font-black text-teal-600 underline underline-offset-4 decoration-teal-200">₹{(showBreakdown.netPayable ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-100/50 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                      <FileText className="h-4 w-4 text-teal-500" />
                    </div>
                    <span className="text-sm font-bold text-teal-800">Total Paid</span>
                  </div>
                  <span className="font-black text-teal-700">₹{(showBreakdown.paidAmount ?? showBreakdown.paid ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-teal-200/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                      <Info className="h-4 w-4 text-amber-500" />
                    </div>
                    <span className="text-sm font-bold text-amber-800">Remaining Balance</span>
                  </div>
                  <span className={`text-lg font-black ${ (showBreakdown.remainingAmount ?? showBreakdown.remaining ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600' }`}>
                    ₹{(showBreakdown.remainingAmount ?? showBreakdown.remaining ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}     </div>
      )}
    </div>
  );
}
