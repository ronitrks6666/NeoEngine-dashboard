import * as XLSX from 'xlsx';

export type StaffDailyAttendance = {
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  hours?: number;
};

export type StaffAnalyticsRow = {
  name?: string;
  role?: string;
  shiftType?: string;
  netHours?: number;
  breakHours?: number;
  hours?: number;
  minHoursRequired?: number;
  compliancePct?: number;
  status?: string;
  overtimeHours?: number;
  underHours?: number;
  dailyEarned?: number;
  daysPresent?: number;
  salary?: number | null;
  dailyAttendance?: StaffDailyAttendance[];
};

export function istYmd(date: Date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function fmtIst(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export type AnalyticsExportOptions = {
  payload: Record<string, unknown>;
  exportLabel: string;
  dateRangeLabel: string;
  laborCostEstimate?: number;
  filenameSlug: string;
};

export function downloadAnalyticsReportXlsx(options: AnalyticsExportOptions) {
  const { payload, exportLabel, dateRangeLabel, laborCostEstimate = 0, filenameSlug } = options;
  const staffStats = Array.isArray(payload.employeeStats)
    ? (payload.employeeStats as StaffAnalyticsRow[])
    : [];

  const summaryRows = [
    ['Metric', 'Value'],
    ['Generated at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
    ['Export scope', exportLabel],
    ['Period', payload.period ?? 'custom'],
    ['Date range', dateRangeLabel],
    ['Total employees', payload.totalEmployees ?? 0],
    ['Active employees today', payload.activeEmployeesToday ?? 0],
    ['Total work hours', payload.totalWorkHours ?? 0],
    ['Hours compliance rate (%)', payload.hoursComplianceRate ?? 0],
    ['Employees met min hours', payload.employeesMetMinHours ?? 0],
    ['Average hours per employee', payload.averageHoursPerEmployee ?? 0],
    ['Total tasks', payload.totalTasks ?? 0],
    ['Completed tasks', payload.completedTasks ?? 0],
    ['Task completion rate (%)', payload.taskCompletionRate ?? 0],
    ['Estimated labor cost', laborCostEstimate],
  ];

  const staffSummaryRows = staffStats.map((s) => ({
    Name: s.name ?? '—',
    Role: s.role ?? '—',
    Shift: s.shiftType ?? '—',
    'Net Hours': s.netHours ?? 0,
    'Break Hours': s.breakHours ?? 0,
    'Gross Hours': s.hours ?? 0,
    'Min Hours Required': s.minHoursRequired ?? 0,
    'Compliance %': s.compliancePct ?? 0,
    Status: s.status ?? '—',
    'Overtime Hours': s.overtimeHours ?? 0,
    'Under Hours': s.underHours ?? 0,
    'Daily Earned': s.dailyEarned ?? 0,
    'Days Present': s.daysPresent ?? 0,
    Salary: s.salary ?? 0,
  }));

  const dailyAttendanceRows = staffStats.flatMap((s) =>
    (s.dailyAttendance ?? []).map((row) => ({
      Staff: s.name ?? '—',
      Role: s.role ?? '—',
      Date: row.date,
      'Punch In (IST)': fmtIst(row.punchIn),
      'Punch Out (IST)': fmtIst(row.punchOut),
      'Net Hours': row.hours ?? 0,
      'Days Present': s.daysPresent ?? 0,
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');
  XLSX.utils.book_append_sheet(
    workbook,
    staffSummaryRows.length > 0
      ? XLSX.utils.json_to_sheet(staffSummaryRows, {
          header: [
            'Name',
            'Role',
            'Shift',
            'Net Hours',
            'Break Hours',
            'Gross Hours',
            'Min Hours Required',
            'Compliance %',
            'Status',
            'Overtime Hours',
            'Under Hours',
            'Daily Earned',
            'Days Present',
            'Salary',
          ],
        })
      : XLSX.utils.aoa_to_sheet([
          [
            'Name',
            'Role',
            'Shift',
            'Net Hours',
            'Break Hours',
            'Gross Hours',
            'Min Hours Required',
            'Compliance %',
            'Status',
            'Overtime Hours',
            'Under Hours',
            'Daily Earned',
            'Days Present',
            'Salary',
          ],
        ]),
    'Staff Summary'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    dailyAttendanceRows.length > 0
      ? XLSX.utils.json_to_sheet(dailyAttendanceRows, {
          header: ['Staff', 'Role', 'Date', 'Punch In (IST)', 'Punch Out (IST)', 'Net Hours', 'Days Present'],
        })
      : XLSX.utils.aoa_to_sheet([
          ['Staff', 'Role', 'Date', 'Punch In (IST)', 'Punch Out (IST)', 'Net Hours', 'Days Present'],
        ]),
    'Daily Working Report'
  );

  if (Array.isArray(payload.dailyHoursData) && payload.dailyHoursData.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.dailyHoursData), 'Daily Hours');
  }
  if (Array.isArray(payload.roleBreakdown) && payload.roleBreakdown.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.roleBreakdown), 'Role Breakdown');
  }
  if (Array.isArray(payload.shiftDistribution) && payload.shiftDistribution.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(payload.shiftDistribution),
      'Shift Distribution'
    );
  }
  if (Array.isArray(payload.taskCompletionByShift) && payload.taskCompletionByShift.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(payload.taskCompletionByShift),
      'Task Completion'
    );
  }
  if (Array.isArray(payload.leaveTrend) && payload.leaveTrend.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.leaveTrend), 'Leave Trend');
  }

  XLSX.writeFile(workbook, `analytics-report-${filenameSlug}-${istYmd(new Date())}.xlsx`);
}
