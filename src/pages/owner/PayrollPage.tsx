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
import { PayrollExportModal } from '@/components/PayrollExportModal';
import type { PayrollReportRow } from '@/utils/payrollExport';
import {
  X,
  Wallet,
  Loader2,
  Calendar,
  Info,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ChevronRight,
  PieChart,
  FileText,
  Clock,
  ChevronDown,
  Download,
  Plus,
} from 'lucide-react';

type PayrollTransactionType =
  | 'salary_payment'
  | 'advance'
  | 'bonus'
  | 'deduction'
  | 'advance_deduction';

function resolveEmployeeId(emp: { employeeId?: string | { _id?: string } }) {
  if (!emp.employeeId) return '';
  return typeof emp.employeeId === 'object' ? String(emp.employeeId._id ?? '') : String(emp.employeeId);
}

export function PayrollPage() {
  const { selectedOutletId } = useOutletStore();
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState<{ periodId: string; employeeId: string; employeeName: string } | null>(null);
  const [showBulkAdjustments, setShowBulkAdjustments] = useState(false);
  const [bulkAdjustmentsInput, setBulkAdjustmentsInput] = useState('');
  const [bulkPreviewResult, setBulkPreviewResult] = useState<any | null>(null);
  const [batchLabelInput, setBatchLabelInput] = useState('');
  const [payoutUtrInput, setPayoutUtrInput] = useState<Record<string, string>>({});
  const [paymentType, setPaymentType] = useState<PayrollTransactionType>('salary_payment');
  const [exporting, setExporting] = useState(false);
  const [showPayrollExport, setShowPayrollExport] = useState(false);
  const [payrollExportRows, setPayrollExportRows] = useState<PayrollReportRow[]>([]);
  const [payrollExportError, setPayrollExportError] = useState<string | null>(null);
  const [showReopenPeriod, setShowReopenPeriod] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [showIssueCenter, setShowIssueCenter] = useState(false);
  const [preLockTab, setPreLockTab] = useState<'missing_bank' | 'non_positive_net' | 'attendance_gaps'>(
    'missing_bank'
  );
  const [issueSearch, setIssueSearch] = useState('');
  const [adjustmentDecisionNote, setAdjustmentDecisionNote] = useState('');
  const [rejectingAdjustmentId, setRejectingAdjustmentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showBreakdown, setShowBreakdown] = useState<any | null>(null);
  const [payrollListSearch, setPayrollListSearch] = useState('');
  const [pageTab, setPageTab] = useState<'summary' | 'attendance'>('summary');
  const [expandedAttendanceId, setExpandedAttendanceId] = useState<string | null>(null);
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

  const reopenMutation = useMutation({
    mutationFn: ({ periodId, reason }: { periodId: string; reason: string }) =>
      payrollApi.reopenPeriod(selectedOutletId!, periodId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-period'] });
      setShowReopenPeriod(false);
      setReopenReason('');
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
      queryClient.invalidateQueries({ queryKey: ['payroll-attendance'] });
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
    enabled: !!selectedOutletId && !!selectedPeriodId && pageTab === 'summary',
  });

  const { data: preLockChecksData } = useQuery({
    queryKey: ['payroll-prelock-checks', selectedOutletId, selectedPeriodId],
    queryFn: () => payrollApi.getPreLockChecks(selectedOutletId!, selectedPeriodId!),
    enabled:
      !!selectedOutletId &&
      !!selectedPeriodId &&
      pageTab === 'summary',
  });

  const { data: attendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['payroll-attendance', selectedOutletId, selectedPeriodId, debouncedPayrollSearch],
    queryFn: () =>
      payrollApi.getPeriodAttendance(selectedOutletId!, selectedPeriodId!, {
        search: debouncedPayrollSearch.trim() || undefined,
      }),
    enabled: !!selectedOutletId && !!selectedPeriodId && pageTab === 'attendance',
  });

  const adjustmentMutation = useMutation({
    mutationFn: (payload: {
      employeeId: string;
      dateKey: string;
      adjustmentType: 'half_day' | 'full_day' | 'clear';
    }) => payrollApi.setAttendanceAdjustment(selectedOutletId!, selectedPeriodId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-period'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    },
  });

  const { data: pendingAdjustmentsData } = useQuery({
    queryKey: ['payroll-pending-adjustments', selectedOutletId, selectedPeriodId],
    queryFn: () => payrollApi.getPendingAdjustments(selectedOutletId!, selectedPeriodId!),
    enabled: !!selectedOutletId && !!selectedPeriodId && pageTab === 'summary',
  });

  const decisionMutation = useMutation({
    mutationFn: (payload: { transactionId: string; decision: 'approve' | 'reject'; note?: string }) =>
      payrollApi.decideAdjustment(selectedOutletId!, selectedPeriodId!, payload.transactionId, {
        decision: payload.decision,
        note: payload.note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-pending-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-period'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      setRejectingAdjustmentId(null);
      setAdjustmentDecisionNote('');
    },
  });

  const { data: payoutBatchesData } = useQuery({
    queryKey: ['payroll-payout-batches', selectedOutletId, selectedPeriodId],
    queryFn: () => payrollApi.listPayoutBatches(selectedOutletId!, selectedPeriodId!),
    enabled: !!selectedOutletId && !!selectedPeriodId && pageTab === 'summary',
  });

  const { data: payrollAnalyticsData } = useQuery({
    queryKey: ['payroll-analytics', selectedOutletId],
    queryFn: () => payrollApi.getPayrollAnalytics(selectedOutletId!, 6),
    enabled: !!selectedOutletId && pageTab === 'summary',
  });

  const createBatchMutation = useMutation({
    mutationFn: () =>
      payrollApi.createPayoutBatch(selectedOutletId!, selectedPeriodId!, {
        label: batchLabelInput.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-payout-batches'] });
      setBatchLabelInput('');
    },
  });

  const updateBatchItemMutation = useMutation({
    mutationFn: (payload: {
      batchId: string;
      employeeId: string;
      status: 'pending' | 'paid' | 'failed' | 'skipped';
      utrNumber?: string;
      note?: string;
    }) =>
      payrollApi.updatePayoutBatchItemStatus(
        selectedOutletId!,
        selectedPeriodId!,
        payload.batchId,
        payload.employeeId,
        { status: payload.status, utrNumber: payload.utrNumber, note: payload.note }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-payout-batches'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-period'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    },
  });

  const finalizeBatchMutation = useMutation({
    mutationFn: (batchId: string) =>
      payrollApi.finalizePayoutBatch(selectedOutletId!, selectedPeriodId!, batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-payout-batches'] });
    },
  });

  const bulkPreviewMutation = useMutation({
    mutationFn: (rows: Array<{ employeePhone?: string; employeeId?: string; type: string; amount: number; notes?: string }>) =>
      payrollApi.bulkPreviewAdjustments(selectedOutletId!, selectedPeriodId!, rows),
    onSuccess: (data) => {
      setBulkPreviewResult(data?.data ?? data);
    },
  });

  const bulkApplyMutation = useMutation({
    mutationFn: (rows: Array<{ employeePhone?: string; employeeId?: string; type: string; amount: number; notes?: string }>) =>
      payrollApi.bulkApplyAdjustments(selectedOutletId!, selectedPeriodId!, { rows, skipInvalid: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-period'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-pending-adjustments'] });
    },
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
  const currentPeriod = periodDetail?.period ?? attendanceData?.data?.period;
  const preLockChecks = preLockChecksData?.data ?? preLockChecksData;
  const preLockSummary = preLockChecks?.summary ?? {};
  const preLockMissingBank = preLockChecks?.checks?.missingBankDetails ?? [];
  const preLockNonPositiveNet = preLockChecks?.checks?.nonPositiveNetPay ?? [];
  const preLockAttendanceGaps = preLockChecks?.checks?.attendanceGaps ?? [];
  const pendingAdjustments = pendingAdjustmentsData?.data?.pendingAdjustments ?? [];
  const payoutBatches = payoutBatchesData?.data?.batches ?? [];
  const latestPayoutBatch = payoutBatches[0] || null;
  const payrollAnalytics = payrollAnalyticsData?.data ?? payrollAnalyticsData;

  const issueRowsCurrentTab =
    preLockTab === 'missing_bank'
      ? preLockMissingBank
      : preLockTab === 'non_positive_net'
        ? preLockNonPositiveNet
        : preLockAttendanceGaps;

  const filteredIssueRows = issueRowsCurrentTab.filter((item: any) =>
    String(item?.name || '')
      .toLowerCase()
      .includes(issueSearch.trim().toLowerCase())
  );

  const downloadIssueCsv = () => {
    const headers =
      preLockTab === 'missing_bank'
        ? 'Name,MissingBankAccount,MissingIFSC,RemainingAmount'
        : preLockTab === 'non_positive_net'
          ? 'Name,NetPayable,RemainingAmount'
          : 'Name,TotalHoursWorked,NetPayable';
    const rows = filteredIssueRows.map((item: any) => {
      if (preLockTab === 'missing_bank') {
        return [
          `"${String(item.name || '').replace(/"/g, '""')}"`,
          item.hasBankAccount ? 'No' : 'Yes',
          item.hasIfsc ? 'No' : 'Yes',
          Number(item.remainingAmount ?? 0).toFixed(2),
        ].join(',');
      }
      if (preLockTab === 'non_positive_net') {
        return [
          `"${String(item.name || '').replace(/"/g, '""')}"`,
          Number(item.netPayable ?? 0).toFixed(2),
          Number(item.remainingAmount ?? 0).toFixed(2),
        ].join(',');
      }
      return [
        `"${String(item.name || '').replace(/"/g, '""')}"`,
        Number(item.totalHoursWorked ?? 0).toFixed(2),
        Number(item.netPayable ?? 0).toFixed(2),
      ].join(',');
    });
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prelock-${preLockTab}-issues.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const attendanceEmployees = attendanceData?.data?.employees ?? [];
  const lateRules = attendanceData?.data?.lateRules;
  const canEditPayroll =
    currentPeriod?.status === 'open' || currentPeriod?.status === 'processing';

  const openTransactionForEmployee = (employeeId: string, employeeName: string) => {
    if (!selectedPeriodId || !canEditPayroll) return;
    setShowAddPayment({ periodId: selectedPeriodId, employeeId, employeeName });
    setPaymentType('salary_payment');
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handleExportPayroll = async () => {
    if (!selectedOutletId || !selectedPeriodId || exporting) return;
    setShowPayrollExport(true);
    setPayrollExportRows([]);
    setPayrollExportError(null);
    setExporting(true);
    try {
      const report = await payrollApi.getPayrollReport(selectedOutletId, selectedPeriodId);
      setPayrollExportRows(report.rows ?? []);
    } catch (err) {
      setPayrollExportError(getApiErrorMessage(err) || 'Failed to load payroll report');
    } finally {
      setExporting(false);
    }
  };

  const payrollExportPeriodLabel = useMemo(() => {
    const period = periods.find((p: { _id: string }) => p._id === selectedPeriodId);
    if (!period?.periodStart || !period?.periodEnd) return 'Selected period';
    const start = new Date(period.periodStart).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    const end = new Date(period.periodEnd).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    return `${start} – ${end}`;
  }, [periods, selectedPeriodId]);

  const submitReopenPeriod = () => {
    if (!selectedPeriodId || reopenMutation.isPending) return;
    const reason = reopenReason.trim();
    if (reason.length < 5) return;
    reopenMutation.mutate({ periodId: selectedPeriodId, reason });
  };

  const lockIssueCount =
    Number(preLockSummary.missingBankDetails ?? 0) +
    Number(preLockSummary.nonPositiveNetPay ?? 0) +
    Number(preLockSummary.attendanceGaps ?? 0);

  const attemptLockPeriod = () => {
    if (!selectedPeriodId || lockMutation.isPending) return;
    if (lockIssueCount > 0) {
      setShowLockWarning(true);
      return;
    }
    lockMutation.mutate(selectedPeriodId);
  };

  const parseBulkAdjustmentsInput = () => {
    const lines = bulkAdjustmentsInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];
    return lines
      .map((line) => {
        const [employeePhone, type, amountRaw, ...notesParts] = line.split(',').map((p) => p.trim());
        const amount = Number(amountRaw);
        return {
          employeePhone,
          type,
          amount,
          notes: notesParts.join(',').trim(),
        };
      })
      .filter((r) => r.employeePhone && r.type && Number.isFinite(r.amount));
  };

  const runBulkPreview = () => {
    const rows = parseBulkAdjustmentsInput();
    if (!rows.length) return;
    bulkPreviewMutation.mutate(rows);
  };

  const runBulkApply = () => {
    const rows = parseBulkAdjustmentsInput();
    if (!rows.length) return;
    bulkApplyMutation.mutate(rows);
  };

  const fmtTime = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const penaltyLabel = (auto: string | null, manual: string | null) => {
    if (manual === 'full_day') return 'Manual full day';
    if (manual === 'half_day') return 'Manual half day';
    if (auto === 'late_half_day') return 'Auto half day (late)';
    if (auto?.startsWith('no_show_')) return `Auto no-show (${auto.replace('no_show_', '')}d cut)`;
    return '—';
  };

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

          <div className="flex gap-2 mb-6">
            {[
              { id: 'summary' as const, label: 'Pay summary' },
              { id: 'attendance' as const, label: 'Attendance & deductions' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPageTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  pageTab === tab.id ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {pageTab === 'summary' && selectedPeriodId && (
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
                    <button
                      onClick={attemptLockPeriod}
                      disabled={lockMutation.isPending}
                      className="px-4 py-2 rounded-xl border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-50 flex items-center gap-2"
                    >
                      {lockMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {lockMutation.isPending ? 'Locking...' : 'Lock period'}
                    </button>
                  )}
                  {currentPeriod?.status === 'locked' && (
                    <button
                      type="button"
                      onClick={() => setShowReopenPeriod(true)}
                      className="px-4 py-2 rounded-xl border border-orange-200 text-orange-700 text-sm font-medium hover:bg-orange-50"
                    >
                      Reopen period
                    </button>
                  )}
                  {canEditPayroll && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowAddPayment({ periodId: selectedPeriodId, employeeId: '', employeeName: '' })
                      }
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add transaction
                    </button>
                  )}
                  {canEditPayroll && (
                    <button
                      type="button"
                      onClick={() => setShowBulkAdjustments(true)}
                      className="px-4 py-2 rounded-xl border border-violet-200 text-violet-700 text-sm font-medium hover:bg-violet-50"
                    >
                      Bulk adjustments
                    </button>
                  )}
                  {selectedPeriodId && (
                    <button
                      type="button"
                      onClick={() => void handleExportPayroll()}
                      disabled={exporting}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                    >
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Download payroll report
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6">
                {preLockChecks && (preLockSummary.missingBankDetails > 0 || preLockSummary.nonPositiveNetPay > 0 || preLockSummary.attendanceGaps > 0) && (
                  <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h3 className="text-sm font-semibold text-amber-900">Pre-lock checks</h3>
                    <p className="mt-1 text-xs text-amber-800">
                      Resolve these issues before locking period for smoother payout and audit trail.
                    </p>
                    <p className="mt-1 text-[11px] text-amber-700">Click a check card to inspect that issue type.</p>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-amber-900 sm:grid-cols-3">
                      <button
                        type="button"
                        aria-pressed={preLockTab === 'missing_bank'}
                        className={`group rounded-lg border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                          preLockTab === 'missing_bank'
                            ? 'border-amber-400 bg-white shadow-sm ring-1 ring-amber-200'
                            : 'border-amber-200 bg-white hover:border-amber-300 hover:shadow-sm'
                        }`}
                        onClick={() => setPreLockTab('missing_bank')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">Missing bank details: {preLockSummary.missingBankDetails ?? 0}</span>
                          <span className="text-[11px] font-medium text-amber-700 group-hover:text-amber-900">View</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        aria-pressed={preLockTab === 'non_positive_net'}
                        className={`group rounded-lg border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                          preLockTab === 'non_positive_net'
                            ? 'border-amber-400 bg-white shadow-sm ring-1 ring-amber-200'
                            : 'border-amber-200 bg-white hover:border-amber-300 hover:shadow-sm'
                        }`}
                        onClick={() => setPreLockTab('non_positive_net')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">Non-positive net pay: {preLockSummary.nonPositiveNetPay ?? 0}</span>
                          <span className="text-[11px] font-medium text-amber-700 group-hover:text-amber-900">View</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        aria-pressed={preLockTab === 'attendance_gaps'}
                        className={`group rounded-lg border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                          preLockTab === 'attendance_gaps'
                            ? 'border-amber-400 bg-white shadow-sm ring-1 ring-amber-200'
                            : 'border-amber-200 bg-white hover:border-amber-300 hover:shadow-sm'
                        }`}
                        onClick={() => setPreLockTab('attendance_gaps')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">Attendance gaps: {preLockSummary.attendanceGaps ?? 0}</span>
                          <span className="text-[11px] font-medium text-amber-700 group-hover:text-amber-900">View</span>
                        </div>
                      </button>
                    </div>

                    <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3">
                      {preLockTab === 'missing_bank' &&
                        (preLockMissingBank.length > 0 ? (
                          <div className="space-y-2">
                            {preLockMissingBank.slice(0, 6).map((item: any) => (
                              <div key={item.employeeId} className="flex items-center justify-between rounded-md border border-amber-100 px-3 py-2 text-xs">
                                <div>
                                  <p className="font-semibold text-gray-800">{item.name}</p>
                                  <p className="text-amber-700">
                                    {item.hasBankAccount ? 'Bank account OK' : 'Missing bank account'} ·{' '}
                                    {item.hasIfsc ? 'IFSC OK' : 'Missing IFSC'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setPayrollListSearch(item.name || '')}
                                  className="rounded-md border border-gray-200 px-2 py-1 text-gray-700 hover:bg-gray-50"
                                >
                                  Review staff
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600">No missing bank details.</p>
                        ))}

                      {preLockTab === 'non_positive_net' &&
                        (preLockNonPositiveNet.length > 0 ? (
                          <div className="space-y-2">
                            {preLockNonPositiveNet.slice(0, 6).map((item: any) => (
                              <div key={item.employeeId} className="rounded-md border border-amber-100 px-3 py-2 text-xs">
                                <p className="font-semibold text-gray-800">{item.name}</p>
                                <p className="text-amber-700">
                                  Net: ₹{Number(item.netPayable ?? 0).toLocaleString()} · Remaining: ₹
                                  {Number(item.remainingAmount ?? 0).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600">No non-positive net pay rows.</p>
                        ))}

                      {preLockTab === 'attendance_gaps' &&
                        (preLockAttendanceGaps.length > 0 ? (
                          <div className="space-y-2">
                            {preLockAttendanceGaps.slice(0, 6).map((item: any) => (
                              <div key={item.employeeId} className="rounded-md border border-amber-100 px-3 py-2 text-xs">
                                <p className="font-semibold text-gray-800">{item.name}</p>
                                <p className="text-amber-700">
                                  Worked: {Number(item.totalHoursWorked ?? 0).toFixed(1)}h · Net: ₹
                                  {Number(item.netPayable ?? 0).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600">No attendance gaps found.</p>
                        ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowIssueCenter(true)}
                        className="rounded-md border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        Open exception center
                      </button>
                    </div>
                  </div>
                )}

                {pendingAdjustments.length > 0 && (
                  <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
                    <h3 className="text-sm font-semibold text-violet-900">Pending adjustment approvals</h3>
                    <p className="mt-1 text-xs text-violet-800">
                      These adjustments are not included in payroll totals until approved.
                    </p>
                    <div className="mt-3 space-y-2">
                      {pendingAdjustments.slice(0, 8).map((item: any) => (
                        <div key={item._id} className="rounded-lg border border-violet-100 bg-white px-3 py-2 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-800">{item.employeeName}</p>
                              <p className="text-violet-700">
                                {String(item.type || '').replaceAll('_', ' ')} · ₹
                                {Number(item.amount ?? 0).toLocaleString()}
                              </p>
                              {item.notes ? <p className="text-gray-500">{item.notes}</p> : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={decisionMutation.isPending}
                                onClick={() =>
                                  decisionMutation.mutate({ transactionId: item._id, decision: 'approve' })
                                }
                                className="rounded-md bg-emerald-600 px-2 py-1 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={decisionMutation.isPending}
                                onClick={() => {
                                  setRejectingAdjustmentId(String(item._id));
                                  setAdjustmentDecisionNote('');
                                }}
                                className="rounded-md border border-red-200 px-2 py-1 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                          {rejectingAdjustmentId === String(item._id) && (
                            <div className="mt-2 space-y-2">
                              <textarea
                                value={adjustmentDecisionNote}
                                onChange={(e) => setAdjustmentDecisionNote(e.target.value)}
                                rows={2}
                                placeholder="Reason for rejection"
                                className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-900"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingAdjustmentId(null);
                                    setAdjustmentDecisionNote('');
                                  }}
                                  className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={decisionMutation.isPending || adjustmentDecisionNote.trim().length < 3}
                                  onClick={() =>
                                    decisionMutation.mutate({
                                      transactionId: item._id,
                                      decision: 'reject',
                                      note: adjustmentDecisionNote.trim(),
                                    })
                                  }
                                  className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                  Confirm reject
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-6 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                  <h3 className="text-sm font-semibold text-cyan-900">Payout batches</h3>
                  <p className="mt-1 text-xs text-cyan-800">
                    Create a transfer batch and track paid/failed entries with UTR numbers.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={batchLabelInput}
                      onChange={(e) => setBatchLabelInput(e.target.value)}
                      placeholder="Batch label (optional)"
                      className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => createBatchMutation.mutate()}
                      disabled={createBatchMutation.isPending || !selectedPeriodId}
                      className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {createBatchMutation.isPending ? 'Creating...' : 'Create payout batch'}
                    </button>
                  </div>

                  {latestPayoutBatch ? (
                    <div className="mt-3 rounded-lg border border-cyan-100 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-800">
                        {latestPayoutBatch.label || 'Latest batch'} · Paid {latestPayoutBatch.paidCount ?? 0}/
                        {(latestPayoutBatch.items || []).length} · ₹
                        {Number(latestPayoutBatch.paidAmount ?? 0).toLocaleString()} paid
                      </p>
                      {latestPayoutBatch.finalized ? (
                        <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                          Finalized
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={finalizeBatchMutation.isPending || Number(latestPayoutBatch.pendingCount ?? 0) > 0}
                          onClick={() => finalizeBatchMutation.mutate(String(latestPayoutBatch._id))}
                          className="rounded border border-cyan-200 px-2 py-1 text-[10px] font-semibold text-cyan-700 hover:bg-cyan-50 disabled:opacity-50"
                        >
                          {finalizeBatchMutation.isPending ? 'Finalizing...' : 'Finalize batch'}
                        </button>
                      )}
                      </div>
                      {!latestPayoutBatch.finalized && Number(latestPayoutBatch.pendingCount ?? 0) > 0 ? (
                        <p className="mt-1 text-[10px] text-amber-700">
                          Finalize is enabled only after pending count becomes 0.
                        </p>
                      ) : null}
                      <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                        {(latestPayoutBatch.items || []).slice(0, 20).map((item: any) => {
                          const key = `${latestPayoutBatch._id}-${item.employeeId}`;
                          return (
                            <div key={key} className="rounded-md border border-cyan-100 px-2 py-2 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-gray-800">{item.employeeName}</p>
                                  <p className="text-cyan-800">
                                    ₹{Number(item.amount ?? 0).toLocaleString()} · {item.status}
                                    {item.utrNumber ? ` · UTR ${item.utrNumber}` : ''}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={payoutUtrInput[key] ?? ''}
                                    onChange={(e) =>
                                      setPayoutUtrInput((prev) => ({ ...prev, [key]: e.target.value }))
                                    }
                                    placeholder="UTR"
                                    className="w-24 rounded border border-gray-200 px-1.5 py-1"
                                  />
                                  <button
                                    type="button"
                                    disabled={updateBatchItemMutation.isPending || !!latestPayoutBatch.finalized}
                                    onClick={() =>
                                      updateBatchItemMutation.mutate({
                                        batchId: latestPayoutBatch._id,
                                        employeeId: item.employeeId,
                                        status: 'paid',
                                        utrNumber: (payoutUtrInput[key] || '').trim(),
                                      })
                                    }
                                    className="rounded bg-emerald-600 px-2 py-1 text-white disabled:opacity-50"
                                  >
                                    Paid
                                  </button>
                                  <button
                                    type="button"
                                    disabled={updateBatchItemMutation.isPending || !!latestPayoutBatch.finalized}
                                    onClick={() =>
                                      updateBatchItemMutation.mutate({
                                        batchId: latestPayoutBatch._id,
                                        employeeId: item.employeeId,
                                        status: 'failed',
                                      })
                                    }
                                    className="rounded border border-red-200 px-2 py-1 text-red-700 disabled:opacity-50"
                                  >
                                    Fail
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-gray-600">No payout batches yet.</p>
                  )}
                </div>

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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
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
                {periodSummary?.variance && (
                  <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                    <h3 className="text-sm font-semibold text-indigo-900">Previous period variance</h3>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div className="rounded-lg bg-white/70 px-3 py-2">
                        <p className="text-xs text-indigo-700">Payroll</p>
                        <p className="font-semibold text-indigo-900">
                          ₹{(periodSummary.variance.payrollDelta ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/70 px-3 py-2">
                        <p className="text-xs text-indigo-700">Base</p>
                        <p className="font-semibold text-indigo-900">
                          ₹{(periodSummary.variance.baseEarnedDelta ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/70 px-3 py-2">
                        <p className="text-xs text-indigo-700">Overtime</p>
                        <p className="font-semibold text-indigo-900">
                          ₹{(periodSummary.variance.overtimeEarnedDelta ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/70 px-3 py-2">
                        <p className="text-xs text-indigo-700">Remaining</p>
                        <p className="font-semibold text-indigo-900">
                          ₹{(periodSummary.variance.remainingDelta ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {payrollAnalytics?.overview && (
                  <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4">
                    <h3 className="text-sm font-semibold text-sky-900">Payroll analytics snapshot</h3>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                      <div className="rounded-lg bg-white/80 px-3 py-2">
                        <p className="text-xs text-sky-700">Payroll delta vs prev</p>
                        <p className="font-semibold text-sky-900">₹{Number(payrollAnalytics.overview.payrollDeltaVsPrev ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg bg-white/80 px-3 py-2">
                        <p className="text-xs text-sky-700">Overtime share</p>
                        <p className="font-semibold text-sky-900">{Number(payrollAnalytics.overview.overtimeSharePct ?? 0).toFixed(2)}%</p>
                      </div>
                      <div className="rounded-lg bg-white/80 px-3 py-2">
                        <p className="text-xs text-sky-700">Deduction share</p>
                        <p className="font-semibold text-sky-900">{Number(payrollAnalytics.overview.deductionSharePct ?? 0).toFixed(2)}%</p>
                      </div>
                    </div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-sky-100 text-sky-800">
                            <th className="py-1 text-left font-medium">Period</th>
                            <th className="py-1 text-right font-medium">Payroll</th>
                            <th className="py-1 text-right font-medium">Paid</th>
                            <th className="py-1 text-right font-medium">Remaining</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(payrollAnalytics.trend || []).map((row: any) => (
                            <tr key={row.periodId} className="border-b border-sky-100/60">
                              <td className="py-1 text-gray-700">
                                {row.periodStart && row.periodEnd
                                  ? `${new Date(row.periodStart).toLocaleDateString('en-IN')} - ${new Date(row.periodEnd).toLocaleDateString('en-IN')}`
                                  : 'Period'}
                              </td>
                              <td className="py-1 text-right text-gray-800">₹{Number(row.totalPayrollAmount ?? 0).toLocaleString()}</td>
                              <td className="py-1 text-right text-emerald-700">₹{Number(row.totalPaidAmount ?? 0).toLocaleString()}</td>
                              <td className="py-1 text-right text-amber-700">₹{Number(row.totalRemainingAmount ?? 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                            <div className="inline-flex items-center gap-1">
                              {canEditPayroll && (
                                <button
                                  type="button"
                                  onClick={() => openTransactionForEmployee(resolveEmployeeId(emp), emp.name)}
                                  className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                                  title="Add payment, bonus, or deduction"
                                >
                                  <Wallet className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setShowBreakdown(emp)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-teal-600 transition-colors"
                                title="View breakdown"
                              >
                                <ChevronRight className="h-5 w-5" />
                              </button>
                            </div>
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

          {pageTab === 'attendance' && selectedPeriodId && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {isAttendanceLoading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
                  <p className="text-sm text-gray-500">Loading attendance…</p>
                </div>
              ) : (
                <>
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Staff attendance</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Check-in, check-out, break, hours worked, and late/no-show deductions for this period.
                    </p>
                    {lateRules?.enabled ? (
                      <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 inline-block">
                        Late rules: ≥{lateRules.lateThresholdMinutes ?? 15} min late → half day; no-show →{' '}
                        {lateRules.noShowPayCutDays ?? 2} day pay cut
                      </p>
                    ) : null}
                  </div>
                  <div className="p-6">
                    <ListSearchBar
                      value={payrollListSearch}
                      onChange={setPayrollListSearch}
                      placeholder="Search by name or phone"
                      className="max-w-md mb-6"
                      aria-label="Search attendance staff"
                    />
                    <div className="space-y-3">
                      {attendanceEmployees.map((emp: {
                        employeeId: string;
                        name: string;
                        role: string;
                        totalHoursWorked: number;
                        days: Array<{
                          date: string;
                          checkIn: string | null;
                          checkOut: string | null;
                          breakStart: string | null;
                          breakEnd: string | null;
                          breakMinutes: number;
                          totalHours: number;
                          lateMinutes: number;
                          autoPenalty: string | null;
                          manualPenalty: string | null;
                          dayUnit: number;
                        }>;
                      }) => {
                        const open = expandedAttendanceId === String(emp.employeeId);
                        return (
                          <div key={String(emp.employeeId)} className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedAttendanceId(open ? null : String(emp.employeeId))
                              }
                              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                            >
                              <div>
                                <p className="font-semibold text-gray-900">{emp.name}</p>
                                <p className="text-xs text-gray-500">{emp.role}</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {(emp.totalHoursWorked ?? 0).toFixed(1)}h
                                </span>
                                <ChevronDown
                                  className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
                                />
                              </div>
                            </button>
                            {open && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-100 bg-white">
                                      <th className="text-left py-2 px-3 font-medium text-gray-600">Date</th>
                                      <th className="text-left py-2 px-3 font-medium text-gray-600">In</th>
                                      <th className="text-left py-2 px-3 font-medium text-gray-600">Out</th>
                                      <th className="text-left py-2 px-3 font-medium text-gray-600">Break</th>
                                      <th className="text-right py-2 px-3 font-medium text-gray-600">Hours</th>
                                      <th className="text-right py-2 px-3 font-medium text-gray-600">Late</th>
                                      <th className="text-left py-2 px-3 font-medium text-gray-600">Penalty</th>
                                      <th className="text-right py-2 px-3 font-medium text-gray-600">Day unit</th>
                                      <th className="text-center py-2 px-3 font-medium text-gray-600">Adjust</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {emp.days.map((day) => (
                                      <tr key={day.date} className="border-b border-gray-50">
                                        <td className="py-2 px-3 text-gray-800">{day.date}</td>
                                        <td className="py-2 px-3">{fmtTime(day.checkIn)}</td>
                                        <td className="py-2 px-3">{fmtTime(day.checkOut)}</td>
                                        <td className="py-2 px-3">
                                          {day.breakStart || day.breakEnd
                                            ? `${fmtTime(day.breakStart)} – ${fmtTime(day.breakEnd)}`
                                            : day.breakMinutes > 0
                                              ? `${day.breakMinutes}m`
                                              : '—'}
                                        </td>
                                        <td className="py-2 px-3 text-right tabular-nums">
                                          {(day.totalHours ?? 0).toFixed(2)}
                                        </td>
                                        <td className="py-2 px-3 text-right tabular-nums">
                                          {day.lateMinutes > 0 ? `${day.lateMinutes}m` : '—'}
                                        </td>
                                        <td className="py-2 px-3">
                                          {penaltyLabel(day.autoPenalty, day.manualPenalty)}
                                        </td>
                                        <td className="py-2 px-3 text-right tabular-nums">{day.dayUnit ?? 0}</td>
                                        <td className="py-2 px-3">
                                          <div className="flex flex-wrap justify-center gap-1">
                                            <button
                                              type="button"
                                              title="Half day deduction"
                                              disabled={adjustmentMutation.isPending}
                                              onClick={() =>
                                                adjustmentMutation.mutate({
                                                  employeeId: String(emp.employeeId),
                                                  dateKey: day.date,
                                                  adjustmentType: 'half_day',
                                                })
                                              }
                                              className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-semibold hover:bg-amber-100 disabled:opacity-50"
                                            >
                                              ½ day
                                            </button>
                                            <button
                                              type="button"
                                              title="Full day deduction"
                                              disabled={adjustmentMutation.isPending}
                                              onClick={() =>
                                                adjustmentMutation.mutate({
                                                  employeeId: String(emp.employeeId),
                                                  dateKey: day.date,
                                                  adjustmentType: 'full_day',
                                                })
                                              }
                                              className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-semibold hover:bg-red-100 disabled:opacity-50"
                                            >
                                              Full
                                            </button>
                                            {(day.manualPenalty || day.autoPenalty) && (
                                              <button
                                                type="button"
                                                title="Clear manual override"
                                                disabled={adjustmentMutation.isPending}
                                                onClick={() =>
                                                  adjustmentMutation.mutate({
                                                    employeeId: String(emp.employeeId),
                                                    dateKey: day.date,
                                                    adjustmentType: 'clear',
                                                  })
                                                }
                                                className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-semibold hover:bg-gray-200 disabled:opacity-50"
                                              >
                                                Clear
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {attendanceEmployees.length === 0 && (
                      <p className="text-center py-8 text-gray-500">No staff match your search.</p>
                    )}
                    {adjustmentMutation.isError && (
                      <p className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                        {getApiErrorMessage(adjustmentMutation.error)}
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

      {(processMutation.isError ||
        lockMutation.isError ||
        reopenMutation.isError ||
        paymentMutation.isError ||
        decisionMutation.isError ||
        bulkPreviewMutation.isError ||
        bulkApplyMutation.isError ||
        createBatchMutation.isError ||
        updateBatchItemMutation.isError ||
        finalizeBatchMutation.isError) && (
        <p className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
          {getApiErrorMessage(
            processMutation.error ??
              lockMutation.error ??
              reopenMutation.error ??
              paymentMutation.error ??
              decisionMutation.error ??
              bulkPreviewMutation.error ??
              bulkApplyMutation.error ??
              createBatchMutation.error ??
              updateBatchItemMutation.error
              ?? finalizeBatchMutation.error
          )}
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

      {/* Add transaction modal */}
      {showAddPayment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-slide-up relative overflow-hidden">
            <div className="p-6 border-b border-gray-100 pr-12">
              <h2 className="text-xl font-bold text-gray-900">Add transaction</h2>
              <p className="text-sm text-gray-500 mt-0.5">Salary payment, advance, bonus, deduction, or advance recovery</p>
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(
                          [
                            { id: 'salary_payment', label: 'Salary', icon: Wallet },
                            { id: 'advance', label: 'Advance', icon: TrendingUp },
                            { id: 'bonus', label: 'Bonus', icon: TrendingUp },
                            { id: 'deduction', label: 'Deduction', icon: TrendingDown },
                            { id: 'advance_deduction', label: 'Advance recovery', icon: TrendingDown },
                          ] as const
                        ).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setPaymentType(t.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                              paymentType === t.id
                                ? 'bg-teal-600 border-teal-600 text-white'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
                            }`}
                          >
                            <t.icon className="h-3.5 w-3.5 shrink-0" />
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

      {showBulkAdjustments && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 animate-slide-up relative overflow-hidden">
            <div className="p-6 border-b border-gray-100 pr-12">
              <h2 className="text-xl font-bold text-gray-900">Bulk adjustments</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Paste rows as: <code>employeePhone,type,amount,notes</code> (one line each)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowBulkAdjustments(false);
                setBulkPreviewResult(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6 space-y-4">
              <textarea
                value={bulkAdjustmentsInput}
                onChange={(e) => setBulkAdjustmentsInput(e.target.value)}
                rows={8}
                placeholder={`9999999999,bonus,500,festival bonus\n8888888888,deduction,200,late penalty`}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={runBulkPreview}
                  disabled={bulkPreviewMutation.isPending}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {bulkPreviewMutation.isPending ? 'Previewing...' : 'Preview'}
                </button>
                <button
                  type="button"
                  onClick={runBulkApply}
                  disabled={bulkApplyMutation.isPending}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {bulkApplyMutation.isPending ? 'Applying...' : 'Apply valid rows'}
                </button>
              </div>
              {bulkPreviewResult && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm">
                  <p className="font-semibold text-violet-900">
                    Preview: {bulkPreviewResult.summary?.validRows ?? 0} valid /{' '}
                    {bulkPreviewResult.summary?.invalidRows ?? 0} invalid
                  </p>
                  {(bulkPreviewResult.errors ?? []).length > 0 && (
                    <div className="mt-2 space-y-1 text-xs text-red-700">
                      {(bulkPreviewResult.errors ?? []).slice(0, 8).map((e: any) => (
                        <p key={`${e.index}-${e.error}`}>
                          Row {Number(e.index) + 1}: {e.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {bulkApplyMutation.isSuccess && (
                <p className="text-sm text-emerald-700">
                  Bulk apply completed. Created {bulkApplyMutation.data?.data?.summary?.createdRows ?? 0} rows.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showIssueCenter && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Exception center</h3>
                <p className="text-xs text-gray-500">Review and export pre-lock issues</p>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueCenter(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPreLockTab('missing_bank')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${preLockTab === 'missing_bank' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800'}`}
                >
                  Missing bank ({preLockSummary.missingBankDetails ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setPreLockTab('non_positive_net')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${preLockTab === 'non_positive_net' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800'}`}
                >
                  Net anomalies ({preLockSummary.nonPositiveNetPay ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setPreLockTab('attendance_gaps')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${preLockTab === 'attendance_gaps' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800'}`}
                >
                  Attendance gaps ({preLockSummary.attendanceGaps ?? 0})
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={issueSearch}
                  onChange={(e) => setIssueSearch(e.target.value)}
                  placeholder="Search by staff name"
                  className="flex-1 min-w-[220px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={downloadIssueCsv}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Download CSV
                </button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto space-y-2">
                {filteredIssueRows.length > 0 ? (
                  filteredIssueRows.map((item: any) => (
                    <div key={item.employeeId} className="rounded-lg border border-gray-100 px-3 py-2 text-sm">
                      <p className="font-semibold text-gray-800">{item.name}</p>
                      {preLockTab === 'missing_bank' ? (
                        <p className="text-amber-700 text-xs">
                          {item.hasBankAccount ? 'Bank account OK' : 'Missing bank account'} · {item.hasIfsc ? 'IFSC OK' : 'Missing IFSC'}
                        </p>
                      ) : preLockTab === 'non_positive_net' ? (
                        <p className="text-amber-700 text-xs">
                          Net ₹{Number(item.netPayable ?? 0).toLocaleString()} · Remaining ₹{Number(item.remainingAmount ?? 0).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-amber-700 text-xs">
                          Hours {Number(item.totalHoursWorked ?? 0).toFixed(1)}h · Net ₹{Number(item.netPayable ?? 0).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No issues match your filter.</p>
                )}
              </div>
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

            {canEditPayroll && selectedPeriodId && (
              <div className="px-8 pb-8 border-t border-gray-100 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    const empId = resolveEmployeeId(showBreakdown);
                    setShowBreakdown(null);
                    openTransactionForEmployee(empId, showBreakdown.name);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
                >
                  <Wallet className="h-4 w-4" />
                  Add payment or adjustment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedOutletId && selectedPeriodId && (
        <PayrollExportModal
          open={showPayrollExport}
          outletId={selectedOutletId}
          periodLabel={payrollExportPeriodLabel}
          filename={`payroll-${selectedPeriodId}-report`}
          rows={payrollExportRows}
          loading={exporting}
          error={payrollExportError}
          onClose={() => setShowPayrollExport(false)}
        />
      )}

      {showReopenPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Reopen locked period</h3>
            <p className="mt-1 text-sm text-gray-600">
              Enter a reason. This action is recorded in payroll audit logs.
            </p>
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              rows={4}
              className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-orange-500 focus:border-orange-500 focus:ring-2"
              placeholder="Reason for reopening this locked period"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowReopenPeriod(false);
                  setReopenReason('');
                }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReopenPeriod}
                disabled={reopenMutation.isPending || reopenReason.trim().length < 5}
                className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reopenMutation.isPending ? 'Reopening...' : 'Confirm reopen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLockWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Lock period with open warnings?</h3>
            <p className="mt-1 text-sm text-gray-600">
              Pre-lock checks found {lockIssueCount} issue{lockIssueCount === 1 ? '' : 's'}. You can still lock, but payout reconciliation may need manual correction.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-amber-900 sm:grid-cols-3">
              <div className="rounded-lg bg-amber-50 px-3 py-2">
                Missing bank: <span className="font-semibold">{preLockSummary.missingBankDetails ?? 0}</span>
              </div>
              <div className="rounded-lg bg-amber-50 px-3 py-2">
                Net pay anomalies: <span className="font-semibold">{preLockSummary.nonPositiveNetPay ?? 0}</span>
              </div>
              <div className="rounded-lg bg-amber-50 px-3 py-2">
                Attendance gaps: <span className="font-semibold">{preLockSummary.attendanceGaps ?? 0}</span>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLockWarning(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Review issues
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedPeriodId) return;
                  setShowLockWarning(false);
                  lockMutation.mutate(selectedPeriodId);
                }}
                disabled={lockMutation.isPending}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {lockMutation.isPending ? 'Locking...' : 'Lock anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
