import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { payrollApi } from '@/api/payroll';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { X } from 'lucide-react';

export function PayrollPage() {
  const { selectedOutletId } = useOutletStore();
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-periods'] }),
  });

  const lockMutation = useMutation({
    mutationFn: (periodId: string) => payrollApi.lockPeriod(selectedOutletId!, periodId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-periods'] }),
  });

  const createPeriodMutation = useMutation({
    mutationFn: () => payrollApi.createPeriod(selectedOutletId!, { startDate: periodStart, endDate: periodEnd }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
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
      setShowAddPayment(null);
      setPaymentAmount('');
    },
  });

  const { data: empData } = useQuery({
    queryKey: ['my-employees', selectedOutletId],
    queryFn: () => employeeApi.getMyEmployees({ outletId: selectedOutletId ?? undefined, limit: 100 }),
    enabled: !!selectedOutletId && !!showAddPayment,
  });

  const periods = periodsData?.data?.periods ?? periodsData?.periods ?? [];
  const employees = empData?.data?.employees ?? [];

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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in-stagger">
          {periods.map((p: { _id: string; periodStart?: string; periodEnd?: string; isProcessed?: boolean; isLocked?: boolean }) => (
            <div
              key={p._id}
              className={`rounded-2xl border p-5 card-hover overflow-hidden ${
                p.isLocked ? 'bg-gray-50 border-gray-200' : p.isProcessed ? 'bg-emerald-50/30 border-emerald-200' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center text-xl">
                  💰
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${
                    p.isLocked ? 'bg-gray-200 text-gray-600' : p.isProcessed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {p.isLocked ? 'Locked' : p.isProcessed ? 'Processed' : 'Draft'}
                </span>
              </div>
              <p className="font-semibold text-gray-900">
                {p.periodStart && p.periodEnd
                  ? `${new Date(p.periodStart).toLocaleDateString()} — ${new Date(p.periodEnd).toLocaleDateString()}`
                  : '-'}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {!p.isProcessed && (
                  <button
                    onClick={() => processMutation.mutate(p._id)}
                    disabled={processMutation.isPending}
                    className="px-3 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
                  >
                    Process
                  </button>
                )}
                {p.isProcessed && !p.isLocked && (
                  <>
                    <button
                      onClick={() => lockMutation.mutate(p._id)}
                      disabled={lockMutation.isPending}
                      className="px-3 py-2 rounded-xl border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-50"
                    >
                      Lock
                    </button>
                    <button
                      onClick={() => setShowAddPayment({ periodId: p._id, employeeId: '', employeeName: '' })}
                      className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                    >
                      Add payment
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {periods.length === 0 && !isLoading && (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-6xl mb-4 opacity-30">💰</div>
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
                  className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50"
                >
                  Create
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
                      className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50"
                    >
                      Add
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
