import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Camera,
  Clock,
  FileWarning,
  UserX,
  StickyNote,
  ArrowRight,
} from 'lucide-react';

type ProofType = 'IN' | 'BREAK_START' | 'OUT' | string;

export type BriefingPoolOpsData = {
  todayYmd?: string;
  yesterdayYmd?: string;
  isSingleDay?: boolean;
  offToday?: { employeeId: string; name: string; roleName?: string }[];
  notPunchedInYet?: {
    employeeId: string;
    name: string;
    roleName?: string;
    expectedStart?: string | null;
  }[];
  dutyRosterExpectedStarts?: {
    employeeId: string;
    name: string;
    roleName?: string;
    expectedStart?: string | null;
  }[];
  yesterdayNotes?: { notes?: string; outletName?: string } | string | null;
  postShiftFlags?: {
    employeeId: string;
    name: string;
    flagSeverity?: string | null;
    outcome?: string | null;
    dateKey?: string | null;
  }[];
  pendingApprovals?: {
    pendingLeaveCount?: number;
    pendingOvertimeCount?: number;
    pendingAttendanceProofCount?: number;
    leaves?: { id: string; employeeName: string; date?: string | null; reason?: string | null }[];
    overtime?: {
      id: string;
      employeeName: string;
      date?: string | null;
      overtimeHours?: number | null;
    }[];
    attendanceProofs?: {
      id: string;
      employeeName: string;
      dateKey?: string | null;
      type?: ProofType;
      failureReasonLabel?: string | null;
      photoUrl?: string | null;
    }[];
  };
  manualAttendanceRepeatOffenders?: {
    employeeId: string;
    name: string;
    proofCount: number;
    dayCount: number;
  }[];
  repeatLate?: {
    employeeId: string;
    name: string;
    roleName?: string;
    lateDays: number;
    avgLateLabel?: string | null;
  }[];
  weakPerformers?: {
    employeeId: string;
    name: string;
    roleName?: string;
    notCompletedCount: number;
    escalatedCount: number;
    completionRate: number;
  }[];
  lateArrivals?: {
    employeeId?: string;
    name?: string;
    lateLabel?: string;
    minutesLate?: number;
  }[];
  unresolvedIssues?: { id?: string; title?: string; priority?: string }[];
};

function proofTypeLabel(type?: string) {
  switch (String(type || '').toUpperCase()) {
    case 'IN':
      return 'Punch in';
    case 'BREAK_START':
      return 'Break in';
    case 'OUT':
      return 'Logout';
    default:
      return type || 'Proof';
  }
}

function postShiftSeverityLabel(severity?: string | null) {
  const s = String(severity || '').toUpperCase();
  if (s === 'RED') return 'Serious';
  if (s === 'AMBER') return 'Warning';
  return s || 'Flag';
}

function postShiftOutcomeLabel(outcome?: string | null) {
  switch (String(outcome || '').toUpperCase()) {
    case 'AUTO_LOGOUT_OUTSIDE_GEOFENCE':
      return 'Left outlet — auto punched out';
    case 'AUTO_LOGOUT_NO_RESPONSE':
      return 'No response — auto punched out';
    case 'AUTO_LOGOUT_ON_TIME':
      return 'Auto punched out at shift end';
    case 'AUTO_LOGOUT_LOCATION_UNAVAILABLE':
      return 'Location unavailable — auto punched out';
    case 'AUTO_LOGOUT_DUTY_SHIFT_EXTENDED':
      return 'Auto punched out after long duty';
    case 'OT_LEFT_OUTLET':
      return 'Left during OT — auto punched out';
    case 'OT_SELF_DECLARED':
      return 'Declared overtime';
    case 'MANAGER_PUNCH_OUT':
      return 'Manager punched out';
    default:
      return outcome ? String(outcome).replace(/_/g, ' ') : 'Post-shift event';
  }
}

function notesText(notes: BriefingPoolOpsData['yesterdayNotes']): string {
  if (!notes) return '';
  if (typeof notes === 'string') return notes.trim();
  return String(notes.notes || '').trim();
}

function OpsPanel({
  title,
  hint,
  icon: Icon,
  tone = 'slate',
  children,
  action,
}: {
  title: string;
  hint?: string;
  icon: typeof Camera;
  tone?: 'slate' | 'amber' | 'violet' | 'rose' | 'teal';
  children: ReactNode;
  action?: ReactNode;
}) {
  const tones = {
    slate: 'border-gray-200 bg-white',
    amber: 'border-amber-100 bg-amber-50/40',
    violet: 'border-violet-100 bg-violet-50/40',
    rose: 'border-rose-100 bg-rose-50/40',
    teal: 'border-teal-100 bg-teal-50/40',
  };
  const iconTone = {
    slate: 'bg-gray-100 text-gray-600',
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
    rose: 'bg-rose-100 text-rose-700',
    teal: 'bg-teal-100 text-teal-700',
  };
  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconTone[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            {hint ? <p className="text-xs text-gray-500 mt-0.5">{hint}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PersonChip({
  name,
  meta,
}: {
  name: string;
  meta?: string | null;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5">
      <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
      {meta ? <p className="text-xs text-gray-500 mt-0.5 truncate">{meta}</p> : null}
    </div>
  );
}

export function BriefingPoolOpsPanels({ data }: { data: BriefingPoolOpsData }) {
  const showMorning = data.isSingleDay !== false;
  const notPunched = data.notPunchedInYet ?? [];
  const roster = data.dutyRosterExpectedStarts ?? [];
  const offToday = data.offToday ?? [];
  const flags = data.postShiftFlags ?? [];
  const pending = data.pendingApprovals;
  const proofs = pending?.attendanceProofs ?? [];
  const proofCount = pending?.pendingAttendanceProofCount ?? proofs.length;
  const manualRepeat = data.manualAttendanceRepeatOffenders ?? [];
  const repeatLate = data.repeatLate ?? [];
  const weak = data.weakPerformers ?? [];
  const lateArrivals = data.lateArrivals ?? [];
  const issues = data.unresolvedIssues ?? [];
  const yNotes = notesText(data.yesterdayNotes);

  const hasAny =
    (showMorning &&
      (notPunched.length > 0 ||
        roster.length > 0 ||
        offToday.length > 0 ||
        flags.length > 0 ||
        proofCount > 0 ||
        (pending?.pendingLeaveCount ?? 0) > 0 ||
        (pending?.pendingOvertimeCount ?? 0) > 0 ||
        manualRepeat.length > 0 ||
        lateArrivals.length > 0 ||
        yNotes.length > 0 ||
        issues.length > 0)) ||
    (!showMorning && (flags.length > 0 || repeatLate.length > 0 || weak.length > 0 || manualRepeat.length > 0));

  if (!hasAny) return null;

  return (
    <div className="space-y-4 mb-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Morning ops</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Same talking points as the mobile briefing — proofs, no-shows, and post-shift flags
        </p>
      </div>

      {showMorning && proofCount > 0 ? (
        <OpsPanel
          title="Pending attendance proofs"
          hint={`${proofCount} waiting for approve / reject`}
          icon={Camera}
          tone="violet"
          action={
            <Link
              to="/owner/attendance"
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900 shrink-0"
            >
              Open Attendance <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {proofs.slice(0, 8).map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white px-3 py-2.5"
              >
                {p.photoUrl ? (
                  <img
                    src={p.photoUrl}
                    alt=""
                    className="w-11 h-11 rounded-lg object-cover shrink-0 bg-gray-100"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                    <Camera className="h-4 w-4 text-violet-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.employeeName}</p>
                  <p className="text-xs text-gray-500">
                    {proofTypeLabel(p.type)}
                    {p.failureReasonLabel ? ` · ${p.failureReasonLabel}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {(pending?.pendingLeaveCount || 0) + (pending?.pendingOvertimeCount || 0) > 0 ? (
            <p className="text-xs text-gray-500 mt-3">
              Also pending: {pending?.pendingLeaveCount || 0} leave
              {(pending?.pendingLeaveCount || 0) === 1 ? '' : 's'},{' '}
              {pending?.pendingOvertimeCount || 0} overtime
            </p>
          ) : null}
        </OpsPanel>
      ) : null}

      {showMorning && notPunched.length > 0 ? (
        <OpsPanel
          title="Not punched in yet"
          hint="Expected on duty but no punch-in so far"
          icon={UserX}
          tone="amber"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {notPunched.slice(0, 12).map((p) => (
              <PersonChip
                key={p.employeeId}
                name={p.name}
                meta={[p.roleName, p.expectedStart ? `Expected ${p.expectedStart}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ))}
          </div>
          {notPunched.length > 12 ? (
            <p className="text-xs text-gray-500 mt-2">+{notPunched.length - 12} more</p>
          ) : null}
        </OpsPanel>
      ) : null}

      {showMorning && roster.length > 0 ? (
        <OpsPanel title="Duty roster starts" hint="Who is scheduled today" icon={Clock} tone="teal">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {roster.slice(0, 12).map((p) => (
              <PersonChip
                key={p.employeeId}
                name={p.name}
                meta={[p.roleName, p.expectedStart || null].filter(Boolean).join(' · ')}
              />
            ))}
          </div>
        </OpsPanel>
      ) : null}

      {showMorning && offToday.length > 0 ? (
        <OpsPanel title="Off today" icon={StickyNote} tone="slate">
          <div className="flex flex-wrap gap-2">
            {offToday.map((p) => (
              <span
                key={p.employeeId}
                className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {p.name}
              </span>
            ))}
          </div>
        </OpsPanel>
      ) : null}

      {flags.length > 0 ? (
        <OpsPanel
          title={showMorning ? 'Post-shift flags' : 'Post-shift flags (period)'}
          hint="Auto logout / geofence outcomes to review"
          icon={AlertTriangle}
          tone="rose"
        >
          <div className="space-y-2">
            {flags.slice(0, 10).map((f, i) => (
              <div
                key={`${f.employeeId}-${f.dateKey || i}`}
                className="rounded-xl border border-rose-100 bg-white px-3 py-2.5 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{postShiftOutcomeLabel(f.outcome)}</p>
                </div>
                <span
                  className={`shrink-0 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg ${
                    String(f.flagSeverity || '').toUpperCase() === 'RED'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {postShiftSeverityLabel(f.flagSeverity)}
                </span>
              </div>
            ))}
          </div>
        </OpsPanel>
      ) : null}

      {showMorning && lateArrivals.length > 0 ? (
        <OpsPanel title="Late arrivals" icon={Clock} tone="amber">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {lateArrivals.slice(0, 8).map((l, i) => (
              <PersonChip
                key={l.employeeId || `${l.name}-${i}`}
                name={l.name || 'Staff'}
                meta={l.lateLabel || (l.minutesLate != null ? `${l.minutesLate} min late` : null)}
              />
            ))}
          </div>
        </OpsPanel>
      ) : null}

      {showMorning && yNotes ? (
        <OpsPanel title="Yesterday notes" icon={StickyNote} tone="slate">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{yNotes}</p>
        </OpsPanel>
      ) : null}

      {manualRepeat.length > 0 ? (
        <OpsPanel
          title="Repeat manual attendance"
          hint="Staff who used manual proof 3+ times recently"
          icon={FileWarning}
          tone="violet"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {manualRepeat.map((r) => (
              <PersonChip
                key={r.employeeId}
                name={r.name}
                meta={`${r.proofCount} proofs · ${r.dayCount} day${r.dayCount === 1 ? '' : 's'}`}
              />
            ))}
          </div>
        </OpsPanel>
      ) : null}

      {!showMorning && repeatLate.length > 0 ? (
        <OpsPanel title="Repeat late" hint="Across this date range" icon={Clock} tone="amber">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {repeatLate.map((r) => (
              <PersonChip
                key={r.employeeId}
                name={r.name}
                meta={[r.roleName, `${r.lateDays} late days`, r.avgLateLabel]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ))}
          </div>
        </OpsPanel>
      ) : null}

      {!showMorning && weak.length > 0 ? (
        <OpsPanel title="Weak performers" hint="Low completion in this range" icon={AlertTriangle} tone="rose">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {weak.map((w) => (
              <PersonChip
                key={w.employeeId}
                name={w.name}
                meta={`${Math.round((w.completionRate || 0) * 100)}% done · ${w.escalatedCount} escalated`}
              />
            ))}
          </div>
        </OpsPanel>
      ) : null}

      {showMorning && issues.length > 0 ? (
        <OpsPanel title="Open issues" icon={AlertTriangle} tone="rose">
          <ul className="space-y-1.5">
            {issues.slice(0, 6).map((iss, i) => (
              <li key={iss.id || i} className="text-sm text-gray-700">
                <span className="font-medium">{iss.title || 'Issue'}</span>
                {iss.priority ? (
                  <span className="text-xs text-gray-400 ml-2 uppercase">{iss.priority}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </OpsPanel>
      ) : null}
    </div>
  );
}
