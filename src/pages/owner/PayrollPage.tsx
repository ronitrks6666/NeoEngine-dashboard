import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { payrollApi } from '@/api/payroll';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { X, Wallet, Loader2, ChevronDown, Calendar } from 'lucide-react';

export function PayrollPage() {
  const { selectedOutletId } = useOutletStore();
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState<{ periodId: string; employeeId: string; employeeName: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
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
    mutationFn: () =>
      payrollApi.addPayment(selectedOutletId!, showAddPayment!.employeeId, {
        amount: parseFloat(paymentAmount),
        payrollPeriodId: showAddPayment!.periodId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-period'] });
      setShowAddPayment(null);
      setPaymentAmount('');
    },
  });

  const { data: empData } = useQuery({
    queryKey: ['my-employees', selectedOutletId],
    queryFn: () => employeeApi.getMyEmployees({ outletId: selectedOutletId ?? undefined, limit: 100 }),
    enabled: !!selectedOutletId && !!showAddPayment,
  });

  const { data: periodDetailData, isLoading: isPeriodDetailLoading } = useQuery({
    queryKey: ['payroll-period', selectedOutletId, selectedPeriodId],
    queryFn: () => payrollApi.getPeriod(selectedOutletId!, selectedPeriodId!),
    enabled: !!selectedOutletId && !!selectedPeriodId,
  });

  const periods = periodsData?.data?.periods ?? periodsData?.periods ?? [];
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
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-500 pointer-events-none" />
                <select
                  value={selectedPeriodId ?? ''}
                  onChange={(e) => setSelectedPeriodId(e.target.value || null)}
                  className="appearance-none pl-11 pr-10 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 font-medium shadow-sm hover:border-teal-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-w-[280px] cursor-pointer transition-colors"
                >
                  {periods.map((p: { _id: string; periodStart?: string; periodEnd?: string; status?: string }) => (
                    <option key={p._id} value={p._id}>
                      {p.periodStart && p.periodEnd
                        ? `${new Date(p.periodStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} — ${new Date(p.periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : 'Period'}
                      {p.status !== 'open' ? ` · ${p.status === 'paid' ? 'Paid' : p.status === 'locked' ? 'Locked' : 'Processed'}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
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
                        <th className="text-right py-3 font-medium text-gray-700">Hours</th>
                        <th className="text-right py-3 font-medium text-gray-700">Earned</th>
                        <th className="text-right py-3 font-medium text-gray-700">Paid</th>
                        <th className="text-right py-3 font-medium text-gray-700">Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodEmployees.map((emp: { employeeId?: string | { _id?: string }; name?: string; totalHoursWorked?: number; netPayable?: number; paidAmount?: number; remainingAmount?: number }) => (
                        <tr key={typeof emp.employeeId === 'object' ? emp.employeeId?._id : emp.employeeId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 font-medium text-gray-900">{emp.name}</td>
                          <td className="text-right py-3 text-gray-600">{(emp.totalHoursWorked ?? 0).toFixed(1)}h</td>
                          <td className="text-right py-3 text-gray-600">₹{(emp.netPayable ?? 0).toLocaleString()}</td>
                          <td className="text-right py-3 text-emerald-600">₹{(emp.paidAmount ?? 0).toLocaleString()}</td>
                          <td className="text-right py-3 text-amber-600">₹{(emp.remainingAmount ?? 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {periodEmployees.length === 0 && (
                  <p className="text-center py-8 text-gray-500">No staff data. Process the period first.</p>
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
        </div>
      )}

      {/* Add payment modal */}
      {showAddPayment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 animate-slide-up relative">
            <div className="p-6 border-b border-gray-100 pr-12">
              <h2 className="text-xl font-semibold text-gray-900">Add payment</h2>
              <p className="text-sm text-gray-500 mt-0.5">Record salary or advance</p>
            </div>
            <button type="button" onClick={() => { setShowAddPayment(null); setPaymentAmount(''); }} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="p-6">
              {!showAddPayment.employeeId ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {employees.map((e: { _id: string; name: string }) => (
                    <button
                      key={e._id}
                      onClick={() => setShowAddPayment({ ...showAddPayment, employeeId: e._id, employeeName: e.name })}
                      className="block w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:bg-teal-50 hover:border-teal-200 transition-colors"
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Employee: <span className="font-medium">{showAddPayment.employeeName}</span></p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => paymentMutation.mutate()}
                      disabled={paymentMutation.isPending || !paymentAmount}
                      className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {paymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {paymentMutation.isPending ? 'Adding...' : 'Add'}
                    </button>
                    <button
                      onClick={() => setShowAddPayment({ ...showAddPayment, employeeId: '', employeeName: '' })}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
              <button onClick={() => { setShowAddPayment(null); setPaymentAmount(''); }} className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
