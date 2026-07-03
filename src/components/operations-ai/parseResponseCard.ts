import type {
  ParsedCardData,
  ThinkingCardData,
} from './types';
import { detectDomainFromMeta, extractContextSuffix, parseNumber, stripOutletPrefix } from './utils';
import { parsePayrollFromText, buildPayrollBody } from './parsePayrollText';

function pctFromAttendance(present: number, late: number, absent: number) {
  const total = present + late + absent;
  if (total <= 0) return 0;
  return Math.round(((present + late) / total) * 100);
}

export function parseThinkingCard(text: string): ThinkingCardData {
  const clean = text.replace(/\.\.\.$/, '').trim();
  const steps = clean
    .split(/\.{3}|…/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    type: 'thinking',
    title: 'Thinking',
    steps: steps.length ? steps : [clean || 'Thinking'],
    rawText: text,
  };
}

export function parseResponseCard(text: string, meta?: string): ParsedCardData {
  const lower = text.toLowerCase();
  if (/^thinking/i.test(text) || meta === 'operations') {
    return parseThinkingCard(text);
  }

  const { cleanText, context } = extractContextSuffix(text);
  const body = stripOutletPrefix(cleanText);

  const staffList = body.match(/^(Absent|Late|Present) staff \(([^)]+)\) — (\d+) total:\s*(.+?)\.?\s*$/i);
  if (staffList) {
    const listType = staffList[1].toLowerCase() as 'absent' | 'late' | 'present';
    const period = staffList[2].trim();
    const total = parseNumber(staffList[3]);
    const namesRaw = staffList[4].replace(/\s*\(\+\d+ more\)\.?$/i, '').trim();
    const staff =
      namesRaw && !/^none\.?$/i.test(namesRaw)
        ? namesRaw.split(',').map((chunk) => {
            const m = chunk.trim().match(/^(.+?)\s*\(([^)]+)\)$/);
            return m ? { name: m[1].trim(), role: m[2].trim() } : { name: chunk.trim() };
          })
        : [];
    return {
      type: 'attendance_list',
      listType,
      staff,
      total,
      context: { ...context, period },
      rawText: text,
    };
  }

  if (/^(Absent|Late|Present) staff \([^)]+\): none/i.test(body)) {
    const listType = body.match(/^(Absent|Late|Present)/i)?.[1]?.toLowerCase() as 'absent' | 'late' | 'present';
    const period = body.match(/\(([^)]+)\)/)?.[1]?.trim();
    return {
      type: 'attendance_list',
      listType: listType || 'absent',
      staff: [],
      total: 0,
      context: { ...context, period },
      rawText: text,
    };
  }

  const taskList = body.match(/^(Escalated tasks|Pending tasks|Completed tasks) \(([^)]+)\) — (\d+) total:\s*(.+?)\.?\s*$/i);
  if (taskList) {
    const listType =
      taskList[1].toLowerCase().includes('escalat')
        ? 'escalated'
        : taskList[1].toLowerCase().includes('pending')
          ? 'pending'
          : 'completed';
    const period = taskList[2].trim();
    const total = parseNumber(taskList[3]);
    const itemsRaw = taskList[4].replace(/\s*\(\+\d+ more\)\.?$/i, '').trim();
    const tasks =
      itemsRaw && !/^none\.?$/i.test(itemsRaw)
        ? itemsRaw.split(';').map((chunk) => {
            const m = chunk.trim().match(/^"(.+?)"\s*—\s*(.+)$/);
            return m
              ? { title: m[1].trim(), employeeName: m[2].trim() }
              : { title: chunk.trim(), employeeName: 'Unassigned' };
          })
        : [];
    return {
      type: 'task_list',
      listType,
      tasks,
      total,
      context: { ...context, period },
      rawText: text,
    };
  }

  if (/^(Escalated tasks|Pending tasks|Completed tasks) \([^)]+\): none/i.test(body)) {
    const listType = body.toLowerCase().includes('escalat')
      ? 'escalated'
      : body.toLowerCase().includes('pending')
        ? 'pending'
        : 'completed';
    const period = body.match(/\(([^)]+)\)/)?.[1]?.trim();
    return {
      type: 'task_list',
      listType,
      tasks: [],
      total: 0,
      context: { ...context, period },
      rawText: text,
    };
  }

  if (/attendance comparison/i.test(body)) {
    return {
      type: 'generic',
      title: 'Attendance Comparison',
      body,
      context,
      rawText: text,
    };
  }

  if (/attendance trend \(/i.test(body)) {
    return {
      type: 'generic',
      title: 'Attendance Trend',
      body,
      context,
      rawText: text,
    };
  }

  if (/attendance compare \(/i.test(body)) {
    return {
      type: 'generic',
      title: 'Attendance Comparison',
      body,
      context,
      rawText: text,
    };
  }

  const employeePayroll = body.match(
    /^payroll for (.+?)(?:\s*\(([^)]+)\))?:\s*period\s+([\d-]+)\s+to\s+([\d-]+),\s*net payable\s+([\d,.]+),\s*gross earned\s+([\d,.]+),\s*paid\s+([\d,.]+),\s*remaining\s+([\d,.]+),\s*hours worked\s+([\d.]+)/i
  );
  if (employeePayroll) {
    return {
      type: 'employee',
      title: 'Employee Payroll',
      name: employeePayroll[1].trim(),
      role: employeePayroll[2]?.trim(),
      status: 'payroll',
      cardMode: 'payroll',
      periodLabel: `${employeePayroll[3]} – ${employeePayroll[4]}`,
      netPayable: parseNumber(employeePayroll[5]),
      grossEarned: parseNumber(employeePayroll[6]),
      paidAmount: parseNumber(employeePayroll[7]),
      remainingAmount: parseNumber(employeePayroll[8]),
      hoursWorked: parseNumber(employeePayroll[9]),
      context: { ...context, employee: employeePayroll[1].trim() },
      rawText: text,
    };
  }

  const employeeSummary = body.match(
    /^employee summary for (.+?)(?:\s*\(([^)]+)\))?\s*\(([^)]+)\):\s*present\s+(\d+)\s+days?,\s*late\s+(\d+)\s+days?,\s*tasks pending\s+(\d+),\s*completed\s+(\d+),\s*escalated\s+(\d+),\s*net payable\s+([\d,.]+)/i
  );
  if (employeeSummary) {
    return {
      type: 'employee',
      title: 'Employee Performance',
      name: employeeSummary[1].trim(),
      role: employeeSummary[2]?.trim(),
      status: 'summary',
      cardMode: 'summary',
      presentDays: parseNumber(employeeSummary[4]),
      lateDays: parseNumber(employeeSummary[5]),
      tasksPending: parseNumber(employeeSummary[6]),
      tasksCompleted: parseNumber(employeeSummary[7]),
      tasksEscalated: parseNumber(employeeSummary[8]),
      netPayable: parseNumber(employeeSummary[9]),
      context: { ...context, employee: employeeSummary[1].trim(), period: employeeSummary[3].trim() },
      rawText: text,
    };
  }

  const employeeToday = body.match(/^(.+?)\s*\(([^)]+)\)\s+is\s+(.+?)\s+today\.?$/i);
  if (employeeToday) {
    return {
      type: 'employee',
      title: 'Employee Attendance',
      name: employeeToday[1].trim(),
      role: employeeToday[2].trim(),
      status: employeeToday[3].trim(),
      context: { ...context, employee: employeeToday[1].trim() },
      rawText: text,
    };
  }

  const employeeDays = body.match(/^(.+?)\s*\(([^)]+)\)\s+came\s+(\d+)\s+day/i);
  if (employeeDays) {
    return {
      type: 'employee',
      title: 'Employee Attendance',
      name: employeeDays[1].trim(),
      role: employeeDays[2].trim(),
      status: 'tracked',
      presentDays: parseNumber(employeeDays[3]),
      context: { ...context, employee: employeeDays[1].trim() },
      rawText: text,
    };
  }

  const employeeSimple = body.match(/^(.+?)\s+is\s+(.+?)\s+today\.?$/i);
  if (employeeSimple && !/attendance|tasks|issues|payroll|leave|staff|roles|events/i.test(body)) {
    return {
      type: 'employee',
      title: 'Employee Attendance',
      name: employeeSimple[1].trim(),
      status: employeeSimple[2].trim(),
      context: { ...context, employee: employeeSimple[1].trim() },
      rawText: text,
    };
  }

  const attendanceRole = body.match(/attendance for\s+(.+?)\s*\(([^)]+)\):\s*present\s+(\d+),\s*late\s+(\d+),\s*absent\s+(\d+)/i);
  if (attendanceRole) {
    const present = parseNumber(attendanceRole[3]);
    const late = parseNumber(attendanceRole[4]);
    const absent = parseNumber(attendanceRole[5]);
    return {
      type: 'attendance',
      title: `Attendance — ${attendanceRole[1].trim()}`,
      present,
      late,
      absent,
      attendancePct: pctFromAttendance(present, late, absent),
      context: { ...context, period: attendanceRole[2].trim() },
      rawText: text,
    };
  }

  const attendance = body.match(/attendance\s*\(([^)]+)\):\s*present\s+(\d+),\s*late\s+(\d+),\s*absent\s+(\d+)/i);
  if (attendance) {
    const present = parseNumber(attendance[2]);
    const late = parseNumber(attendance[3]);
    const absent = parseNumber(attendance[4]);
    return {
      type: 'attendance',
      title: 'Attendance Summary',
      present,
      late,
      absent,
      attendancePct: pctFromAttendance(present, late, absent),
      context: { ...context, period: attendance[1].trim() },
      rawText: text,
    };
  }

  const tasks = body.match(/tasks\s*\(([^)]+)\):\s*pending\s+(\d+),\s*completed\s+(\d+),\s*escalated\s+(\d+),\s*completion\s+([\d.]+)%/i);
  if (tasks) {
    return {
      type: 'tasks',
      title: 'Tasks Overview',
      pending: parseNumber(tasks[2]),
      completed: parseNumber(tasks[3]),
      escalated: parseNumber(tasks[4]),
      completionPct: parseNumber(tasks[5]),
      context: { ...context, period: tasks[1].trim() },
      rawText: text,
    };
  }

  const issues = body.match(/issues\s*\(([^)]+)\):\s*open\s+(\d+),\s*resolved\s+(\d+),\s*closed\s+(\d+)/i);
  if (issues) {
    const recentPart = body.match(/recent:\s*(.+?)\.?$/i);
    const recent = recentPart
      ? recentPart[1].split(';').map((chunk) => {
          const m = chunk.trim().match(/#?(\d+)\s+(.+)/);
          return m ? { number: m[1], title: m[2].trim() } : { title: chunk.trim() };
        })
      : [];
    return {
      type: 'issues',
      title: 'Issues Summary',
      open: parseNumber(issues[2]),
      resolved: parseNumber(issues[3]),
      closed: parseNumber(issues[4]),
      recent,
      context: { ...context, period: issues[1].trim() },
      rawText: text,
    };
  }

  const payrollParsed = parsePayrollFromText(body);
  if (payrollParsed) {
    return {
      type: 'generic',
      title: 'Payroll Summary',
      body: buildPayrollBody(payrollParsed),
      context,
      rawText: text,
    };
  }

  const leave = body.match(/leave\s*\(([^)]+)\):\s*(?:on leave\s+(\d+),\s*)?pending\s+(\d+),\s*approved\s+(\d+),\s*rejected\s+(\d+)/i);
  if (leave) {
    return {
      type: 'leave',
      title: 'Leave Summary',
      onLeave: parseNumber(leave[2]),
      pending: parseNumber(leave[3]),
      approved: parseNumber(leave[4]),
      rejected: parseNumber(leave[5]),
      context: { ...context, period: leave[1].trim() },
      rawText: text,
    };
  }

  if (/combined operations view/i.test(body)) {
    const highlights = body
      .replace(/combined operations view\s*\([^)]+\):\s*/i, '')
      .split('|')
      .map((chunk) => ({ label: 'Insight', value: chunk.trim() }));
    return {
      type: 'planned',
      title: 'Combined Operations View',
      body,
      highlights,
      context,
      rawText: text,
    };
  }

  if (/^staff:/i.test(body)) {
    const active = body.match(/active\s+(\d+)\/(\d+)/i);
    return {
      type: 'staff',
      title: 'Staff Summary',
      body,
      highlights: active
        ? [
            { label: 'Active', value: active[1] },
            { label: 'Total', value: active[2] },
          ]
        : undefined,
      context,
      rawText: text,
    };
  }

  if (/^roles:/i.test(body)) {
    return { type: 'roles', title: 'Roles Summary', body, context, rawText: text };
  }

  if (/^events\s*\(/i.test(body)) {
    const count = body.match(/events\s*\([^)]+\):\s*(\d+)/i);
    return {
      type: 'events',
      title: 'Events Summary',
      body,
      highlights: count ? [{ label: 'Count', value: count[1] }] : undefined,
      context,
      rawText: text,
    };
  }

  if (/^outlets:/i.test(body) || /lowest attendance outlet/i.test(body)) {
    return { type: 'outlet', title: 'Outlet Summary', body, context, rawText: text };
  }

  if (meta === 'error' || /could not fetch|try again/i.test(lower)) {
    return { type: 'error', title: 'Something went wrong', body, context, rawText: text };
  }

  const domain = detectDomainFromMeta(meta);
  if (domain === 'knowledge') {
    return { type: 'knowledge', title: 'Policy & SOP', body, context, rawText: text };
  }

  if (domain === 'analytics') {
    return { type: 'analytics', title: 'Operations Analytics', body, context, rawText: text };
  }

  if (/did you mean/i.test(body)) {
    return { type: 'generic', title: 'Clarification needed', body, context, rawText: text };
  }

  return {
    type: 'generic',
    title: meta?.includes('Operations AI') ? 'Operations AI' : 'Summary',
    body,
    context,
    rawText: text,
  };
}
