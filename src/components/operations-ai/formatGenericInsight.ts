import type { GenericCardData } from './types';
import { detectDomainFromMeta, parseNumber } from './utils';
import { suggestionsForDomain } from './suggestions';
import {
  formatCurrencyInr,
  formatPayrollPeriodLabel,
  parsePayrollFromText,
} from './parsePayrollText';

export type InsightRanking = {
  rank: number;
  name: string;
  subtitle?: string;
};

export type InsightKpi = {
  label: string;
  value: string;
  accent: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'gray';
};

export type InsightEmptyState = {
  title: string;
  reasons: string[];
};

export type FormattedInsight = {
  category: string;
  title: string;
  rankings: InsightRanking[];
  kpis: InsightKpi[];
  bullets: string[];
  badges: Array<{ label: string; tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'gray' }>;
  dateChips: string[];
  emptyState?: InsightEmptyState;
  aiInsight: string;
  followUps: string[];
  isClarification: boolean;
  clarificationPrompt?: string;
  clarificationOptions: string[];
  isError: boolean;
};

export function formatPeriodLabel(period?: string) {
  if (!period) return '';
  const map: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    last7: 'Last 7 Days',
    last30: 'Last 30 Days',
    last_month: 'Last Month',
    this_month: 'This Month',
    this_week: 'This Week',
  };
  if (map[period]) return map[period];
  return period.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function categoryLabel(type: GenericCardData['type'], body: string, meta?: string) {
  if (type === 'staff') return 'Staff';
  if (type === 'roles') return 'Roles';
  if (type === 'events') return 'Events';
  if (type === 'outlet') return 'Outlets';
  if (type === 'knowledge') return 'Policy & SOP';
  if (type === 'analytics') return 'Operations Analytics';
  if (type === 'planned') return 'Combined View';
  if (type === 'error') return 'Attention Needed';
  const domain = detectDomainFromMeta(meta);
  const labels: Record<string, string> = {
    attendance: 'Attendance',
    tasks: 'Tasks',
    payroll: 'Payroll',
    issues: 'Issues',
    leave: 'Leave',
    staff: 'Staff',
  };
  if (labels[domain]) return labels[domain];
  if (/attendance/i.test(body)) return 'Attendance';
  if (/payroll/i.test(body)) return 'Payroll';
  if (/task/i.test(body)) return 'Tasks';
  if (/issue/i.test(body)) return 'Issues';
  return 'Operations Insight';
}

function parseRankings(body: string): { title: string; rankings: InsightRanking[] } | null {
  const top = body.match(/^(Top|Lowest) attendance contributors\s*\([^)]+\):\s*(.+?)\.?\s*$/i);
  if (!top) return null;
  const kind = top[1].toLowerCase() === 'top' ? 'Top' : 'Lowest';
  const title = `${kind} Attendance Contributors`;
  const items = top[2].split(',').map((chunk) => chunk.trim()).filter(Boolean);
  const rankings = items.map((item, i) => {
    const m = item.match(/^(.+?)\s*\((\d+)d\)$/i);
    if (m) {
      const days = parseNumber(m[2]);
      return {
        rank: i + 1,
        name: m[1].trim(),
        subtitle: days === 0 ? 'No attendance recorded' : `${days} day${days === 1 ? '' : 's'} present`,
      };
    }
    return { rank: i + 1, name: item, subtitle: kind === 'Top' ? 'Strong attendance' : 'Needs attention' };
  });
  return { title, rankings };
}

function parsePayrollInsight(body: string): {
  kpis: InsightKpi[];
  emptyState?: InsightEmptyState;
  aiInsight: string;
  dateChips: string[];
} | null {
  const parsed = parsePayrollFromText(body);
  if (!parsed) return null;
  const dateChips = [formatPayrollPeriodLabel(parsed.periodStart, parsed.periodEnd)];
  if (parsed.recordsCount === 0 && parsed.netPayable === 0) {
    return {
      kpis: [],
      dateChips,
      emptyState: {
        title: 'No payroll data found for the selected period',
        reasons: [
          'Payroll has not been processed yet',
          'Wrong outlet may be selected',
          'No payroll cycle exists for this period',
        ],
      },
      aiInsight:
        'No payroll has been processed for the selected period. Once payroll is generated, this card will automatically show gross pay, deductions, net pay and employee count.',
    };
  }
  const kpis: InsightKpi[] = [
    { label: 'Staff', value: String(parsed.recordsCount), accent: 'sky' },
    { label: 'Total Payable', value: formatCurrencyInr(parsed.netPayable), accent: 'emerald' },
  ];
  if (parsed.paidAmount != null) {
    kpis.push({ label: 'Paid', value: formatCurrencyInr(parsed.paidAmount), accent: 'violet' });
  }
  if (parsed.remainingAmount != null) {
    kpis.push({ label: 'Remaining', value: formatCurrencyInr(parsed.remainingAmount), accent: 'amber' });
  }
  return {
    kpis,
    dateChips,
    aiInsight:
      parsed.recordsCount > 0
        ? `Payroll covers ${parsed.recordsCount} staff member${parsed.recordsCount === 1 ? '' : 's'} with net payable of ${formatCurrencyInr(parsed.netPayable)}.`
        : 'Payroll summary is available but no employee records were found.',
  };
}

function parseAttendanceTrendInsight(body: string): {
  kpis: InsightKpi[];
  bullets: string[];
  aiInsight: string;
  dateChips: string[];
} | null {
  const m = body.match(
    /attendance trend \(([^)]+)\):\s*(.+?)\.\s*average\s+([\d.]+)\/day across (\d+) days \((\d+) staff\)/i
  );
  if (!m) return null;
  const period = m[1];
  const pointsRaw = m[2];
  const avg = m[3];
  const dayCount = m[4];
  const staff = m[5];
  const points = pointsRaw
    .split(';')
    .map((chunk) => {
      const p = chunk.trim().match(/([\d-]+)\s+present\s+(\d+)/);
      return p ? `${p[1]}: ${p[2]} present` : chunk.trim();
    })
    .filter(Boolean);
  return {
    kpis: [
      { label: 'Avg Present/Day', value: avg, accent: 'emerald' },
      { label: 'Days Tracked', value: dayCount, accent: 'sky' },
      { label: 'Staff', value: staff, accent: 'violet' },
    ],
    bullets: points.slice(-7),
    dateChips: [formatPeriodLabel(period)],
    aiInsight:
      points.length === 0 || Number(avg) === 0
        ? 'No check-ins recorded in this period yet. The trend will populate as staff punch in.'
        : `Daily attendance averaged ${avg} present staff over ${dayCount} days.`,
  };
}

function parsePeriodCompareInsight(body: string): {
  kpis: InsightKpi[];
  aiInsight: string;
  dateChips: string[];
} | null {
  const m = body.match(
    /attendance compare \(([^)]+) vs ([^)]+)\):\s*current avg ([\d.]+) present\/day \((\d+) present-days, (\d+) late-days over (\d+)d\)\.\s*prior avg ([\d.]+) present\/day \((\d+) present-days, (\d+) late-days over (\d+)d\)\.\s*change ([+-]?\d+)%/i
  );
  if (!m) return null;
  const currentPeriod = m[1];
  const priorPeriod = m[2];
  const curAvg = m[3];
  const priAvg = m[7];
  const change = Number(m[11]);
  return {
    kpis: [
      { label: 'Current Avg/Day', value: curAvg, accent: 'emerald' },
      { label: 'Prior Avg/Day', value: priAvg, accent: 'sky' },
      {
        label: 'Change',
        value: `${change >= 0 ? '+' : ''}${change}%`,
        accent: change >= 0 ? 'emerald' : 'rose',
      },
    ],
    dateChips: [`${formatPeriodLabel(currentPeriod)} vs ${formatPeriodLabel(priorPeriod)}`],
    aiInsight:
      change > 5
        ? `Attendance improved by ${change}% compared to the prior period.`
        : change < -5
          ? `Attendance dropped ${Math.abs(change)}% vs the prior period — worth a manager check-in.`
          : 'Attendance is broadly stable between the two periods.',
  };
}

function parseStaffInsight(body: string): { kpis: InsightKpi[]; aiInsight: string } | null {
  const m = body.match(/staff:\s*active\s+(\d+)\/(\d+)/i);
  if (!m) return null;
  const active = parseNumber(m[1]);
  const total = parseNumber(m[2]);
  const roles = body.match(/active roles\s+(\d+)/i);
  const types = body.match(/role types\s+(\d+)/i);
  const kpis: InsightKpi[] = [
    { label: 'Active Staff', value: `${active}/${total}`, accent: 'emerald' },
  ];
  if (roles) kpis.push({ label: 'Active Roles', value: roles[1], accent: 'sky' });
  if (types) kpis.push({ label: 'Role Types', value: types[1], accent: 'violet' });
  return {
    kpis,
    aiInsight:
      active === total
        ? 'All registered staff are currently active at this outlet.'
        : `${total - active} staff member${total - active === 1 ? ' is' : 's are'} inactive. Review staffing if capacity looks low.`,
  };
}

function parseRolesInsight(body: string): { kpis: InsightKpi[]; bullets: string[]; aiInsight: string } | null {
  if (!/^roles:/i.test(body)) return null;
  const active = body.match(/active roles\s+(\d+)/i);
  const types = body.match(/role types\s+(\d+)/i);
  const namesMatch = body.match(/\(([^)]+)\)\.?$/);
  const names = namesMatch
    ? namesMatch[1].split(',').map((n) => n.trim()).filter(Boolean)
    : [];
  const kpis: InsightKpi[] = [];
  if (active) kpis.push({ label: 'Active Roles', value: active[1], accent: 'emerald' });
  if (types) kpis.push({ label: 'Role Types', value: types[1], accent: 'sky' });
  return {
    kpis,
    bullets: names,
    aiInsight:
      names.length > 0
        ? `Your outlet uses ${names.length} distinct role type${names.length === 1 ? '' : 's'} across operations.`
        : 'Role configuration is active. Add role names in staff settings for richer insights.',
  };
}

function parseCombinedInsight(body: string): { bullets: string[]; aiInsight: string } | null {
  if (!/combined operations view/i.test(body)) return null;
  const chunks = body
    .replace(/combined operations view\s*\([^)]+\):\s*/i, '')
    .replace(/\.\s*$/, '')
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean);
  return {
    bullets: chunks,
    aiInsight:
      chunks.length > 1
        ? 'Multiple operational areas were reviewed together. Focus on the weakest metric first for the biggest impact.'
        : 'Here is a combined snapshot across your selected operational areas.',
  };
}

function parseOutletInsight(body: string): { bullets: string[]; aiInsight: string } | null {
  if (/lowest attendance outlet/i.test(body)) {
    const m = body.match(/lowest attendance outlet[^:]*:\s*(.+?)\s+with present\s+(\d+)\/(\d+)\s*\(([\d.]+)%\)/i);
    if (m) {
      return {
        bullets: [
          `${m[1]} — ${m[2]} of ${m[3]} staff present (${m[4]}%)`,
        ],
        aiInsight: 'This outlet has the lowest attendance in the selected period. Consider reviewing shift schedules or staffing levels.',
      };
    }
  }
  if (/^outlets:/i.test(body)) {
    const names = body.replace(/^outlets:\s*/i, '').replace(/\.\s*$/, '').split(',').map((n) => n.trim());
    return {
      bullets: names,
      aiInsight: `You have ${names.length} active outlet${names.length === 1 ? '' : 's'} in your portfolio.`,
    };
  }
  return null;
}

function parseOperationsSummary(body: string): {
  title: string;
  kpis: InsightKpi[];
  bullets: string[];
  aiInsight: string;
  period?: string;
} | null {
  const m = body.match(/operations summary\s*\(([^)]+)\):\s*(.+)/i);
  if (!m) return null;
  const period = m[1].trim();
  const rest = m[2].replace(/\.\s*\(based on.*$/i, '').replace(/\.\s*$/, '').trim();

  const kpis: InsightKpi[] = [];
  const bullets: string[] = [];

  const att = rest.match(/attendance present (\d+), late (\d+), absent (\d+)/i);
  if (att) {
    kpis.push({ label: 'Present', value: att[1], accent: 'emerald' });
    kpis.push({ label: 'Late', value: att[2], accent: 'amber' });
    kpis.push({ label: 'Absent', value: att[3], accent: 'rose' });
    bullets.push(`Attendance — ${att[1]} present, ${att[2]} late, ${att[3]} absent`);
  }

  const tasks = rest.match(/tasks pending (\d+), completed (\d+), escalated (\d+), completion ([\d.]+)%/i);
  if (tasks) {
    kpis.push({ label: 'Pending Tasks', value: tasks[1], accent: 'amber' });
    kpis.push({ label: 'Escalated', value: tasks[3], accent: 'rose' });
    bullets.push(
      `Tasks — ${tasks[1]} pending, ${tasks[2]} completed, ${tasks[3]} escalated (${tasks[4]}% completion)`
    );
  }

  const issues = rest.match(/issues open (\d+), resolved (\d+), closed (\d+)/i);
  if (issues) {
    kpis.push({ label: 'Open Issues', value: issues[1], accent: 'rose' });
    bullets.push(`Issues — ${issues[1]} open, ${issues[2]} resolved, ${issues[3]} closed`);
  }

  const leave = rest.match(/leave on leave (\d+), pending (\d+)/i);
  if (leave) {
    kpis.push({ label: 'On Leave', value: leave[1], accent: 'sky' });
    bullets.push(`Leave — ${leave[1]} on leave, ${leave[2]} pending approval`);
  }

  const staff = rest.match(/staff active (\d+)\/(\d+)/i);
  if (staff) {
    kpis.push({ label: 'Active Staff', value: `${staff[1]}/${staff[2]}`, accent: 'emerald' });
    bullets.push(`Staff — ${staff[1]} of ${staff[2]} active`);
  }

  const payroll = rest.match(/payroll net payable ([\d.]+), records (\d+)/i);
  if (payroll) {
    const net = parseNumber(payroll[1]);
    const records = parseNumber(payroll[2]);
    if (net > 0 || records > 0) {
      kpis.push({ label: 'Net Pay', value: formatCurrencyInr(net), accent: 'violet' });
    }
    bullets.push(
      records > 0
        ? `Payroll — ${formatCurrencyInr(net)} net payable across ${records} records`
        : 'Payroll — no records processed for this period'
    );
  }

  const absent = att ? parseNumber(att[3]) : 0;
  const late = att ? parseNumber(att[2]) : 0;
  const escalated = tasks ? parseNumber(tasks[3]) : 0;
  const openIssues = issues ? parseNumber(issues[1]) : 0;
  const pendingTasks = tasks ? parseNumber(tasks[1]) : 0;

  const alerts: string[] = [];
  if (absent > 0 && att && parseNumber(att[1]) === 0) alerts.push('no staff checked in yet');
  else if (absent > 5) alerts.push('absence count is elevated');
  if (late > 0) alerts.push(`${late} late arrival${late === 1 ? '' : 's'} today`);
  if (escalated > 0) alerts.push(`${escalated} escalated task${escalated === 1 ? '' : 's'} need attention`);
  if (openIssues > 0) alerts.push(`${openIssues} open issue${openIssues === 1 ? '' : 's'} are active`);
  if (pendingTasks > 10) alerts.push(`${pendingTasks} tasks still pending`);

  const aiInsight =
    alerts.length > 0
      ? `Priority areas: ${alerts.join('; ')}. Start with attendance and escalations, then review open issues.`
      : 'Operations look stable across attendance, tasks, and issues for this period.';

  return {
    title: period === 'today' ? "Today's Operations Summary" : `Operations Summary — ${formatPeriodLabel(period)}`,
    kpis,
    bullets,
    aiInsight,
    period,
  };
}

function buildAiInsightFallback(data: GenericCardData, category: string): string {
  if (data.type === 'error') {
    return 'Something interrupted this request. Try again or rephrase your question.';
  }
  if (/attendance/i.test(category)) {
    return 'Attendance remained stable for the selected period. No unusual patterns were detected in this summary.';
  }
  if (/payroll/i.test(category)) {
    return 'Review payroll processing status if numbers look unexpected for this period.';
  }
  if (/task/i.test(category)) {
    return 'Monitor pending and escalated tasks to keep daily operations on track.';
  }
  if (/issue/i.test(category)) {
    return 'Track open issues closely — recurring themes often point to SOP or training gaps.';
  }
  return 'Here is what I found based on your current outlet and period selection.';
}

function followUpsFor(data: GenericCardData, meta?: string, title?: string): string[] {
  const domain = detectDomainFromMeta(meta);
  const base = suggestionsForDomain(domain);
  const body = data.body;
  if (/attendance trend/i.test(title || body)) {
    return ['Compare last month', 'Who is absent today?', 'Top performers', 'Compare yesterday'];
  }
  if (/attendance comparison|attendance compare/i.test(title || body)) {
    return ['Attendance trend', 'Who came late?', 'Show absentees', 'Operations summary'];
  }
  if (/top attendance|contributors/i.test(title || data.body)) {
    return ['Compare last month', 'Show attendance trend', 'Late employees', 'Who is absent today?'];
  }
  if (/payroll/i.test(data.body)) {
    return ['Compare last month', 'Explain deductions', 'Show overtime', 'Staff payroll breakdown'];
  }
  if (data.type === 'planned') {
    return ['Attendance today', 'Pending tasks', 'Recent issues', 'Who came late?'];
  }
  if (/operations summary/i.test(data.body)) {
    return ['Who is absent today?', 'Escalated tasks', 'Recent issues', 'Attendance trend'];
  }
  return base;
}

export function formatGenericInsight(data: GenericCardData, meta?: string): FormattedInsight {
  const body = data.body.trim();
  const isClarification = /did you mean/i.test(body);
  const isError = data.type === 'error';

  if (isClarification) {
    const options =
      body
        .split(/did you mean:?\s*/i)[1]
        ?.split(/[?,]/)
        .map((s) => s.trim())
        .filter(Boolean) || [];
    return {
      category: 'Clarification',
      title: 'Help me identify the right person',
      rankings: [],
      kpis: [],
      bullets: [],
      badges: [],
      dateChips: [],
      aiInsight: 'I found multiple possible matches. Tap a name below to continue with the right employee.',
      followUps: [],
      isClarification: true,
      clarificationPrompt: body.split(/did you mean/i)[0].trim(),
      clarificationOptions: options,
      isError: false,
    };
  }

  const trendParsed = parseAttendanceTrendInsight(body);
  const compareParsed = parsePeriodCompareInsight(body);
  const rankingParsed = parseRankings(body);
  const summaryParsed = parseOperationsSummary(body);
  const payrollParsed = parsePayrollInsight(body);
  const staffParsed = parseStaffInsight(body);
  const rolesParsed = parseRolesInsight(body);
  const combinedParsed = parseCombinedInsight(body);
  const outletParsed = parseOutletInsight(body);

  const category = summaryParsed
    ? 'Operations Summary'
    : compareParsed
      ? 'Attendance'
      : trendParsed
        ? 'Attendance'
        : payrollParsed
          ? 'Payroll'
          : categoryLabel(data.type, body, meta);
  let title = summaryParsed
    ? summaryParsed.title
    : data.title === 'Summary' || data.title === 'Operations AI'
      ? category
      : data.title;
  let rankings: InsightRanking[] = [];
  let kpis: InsightKpi[] = data.highlights?.map((h) => ({
    label: h.label,
    value: h.value,
    accent: 'emerald' as const,
  })) || [];
  let bullets: string[] = [];
  let badges: FormattedInsight['badges'] = [];
  let dateChips: string[] = [];
  let emptyState: InsightEmptyState | undefined;
  let aiInsight = '';

  if (summaryParsed) {
    title = summaryParsed.title;
    kpis = summaryParsed.kpis;
    bullets = summaryParsed.bullets;
    aiInsight = summaryParsed.aiInsight;
    if (summaryParsed.period) dateChips = [formatPeriodLabel(summaryParsed.period)];
  } else if (compareParsed) {
    title = 'Attendance Comparison';
    kpis = compareParsed.kpis;
    dateChips = compareParsed.dateChips;
    aiInsight = compareParsed.aiInsight;
  } else if (trendParsed) {
    title = 'Attendance Trend';
    kpis = trendParsed.kpis;
    bullets = trendParsed.bullets;
    dateChips = trendParsed.dateChips;
    aiInsight = trendParsed.aiInsight;
  } else if (rankingParsed) {
    title = rankingParsed.title;
    rankings = rankingParsed.rankings.map((r) => ({
      ...r,
      subtitle:
        r.subtitle ||
        (rankingParsed.title.startsWith('Top') ? 'Perfect Attendance' : 'Lowest attendance'),
    }));
    aiInsight =
      rankingParsed.title.startsWith('Top')
        ? 'These employees maintained strong attendance throughout the selected period and can be considered for appreciation or rewards.'
        : 'These employees had the lowest attendance in the selected period. A quick check-in may help identify blockers.';
  } else if (payrollParsed) {
    title = 'Payroll Summary';
    kpis = payrollParsed.kpis;
    dateChips = payrollParsed.dateChips;
    emptyState = payrollParsed.emptyState;
    aiInsight = payrollParsed.aiInsight;
    bullets = [];
  } else if (staffParsed) {
    title = 'Staff Overview';
    kpis = staffParsed.kpis;
    aiInsight = staffParsed.aiInsight;
  } else if (rolesParsed) {
    title = 'Roles Overview';
    kpis = rolesParsed.kpis;
    bullets = rolesParsed.bullets;
    aiInsight = rolesParsed.aiInsight;
  } else if (combinedParsed) {
    title = 'Combined Operations View';
    bullets = combinedParsed.bullets;
    aiInsight = combinedParsed.aiInsight;
  } else if (outletParsed) {
    title = /lowest/i.test(body) ? 'Outlet Attendance Comparison' : 'Your Outlets';
    bullets = outletParsed.bullets;
    aiInsight = outletParsed.aiInsight;
  } else if (data.type === 'knowledge') {
    title = 'Policy & Procedures';
    bullets = body.split(/(?<=\.)\s+/).filter((s) => s.length > 10);
    aiInsight = 'These policies and SOPs apply to your outlet. Share them with managers for consistent execution.';
  } else {
    const payrollFallback = parsePayrollInsight(body);
    if (payrollFallback) {
      title = 'Payroll Summary';
      kpis = payrollFallback.kpis;
      dateChips = payrollFallback.dateChips;
      emptyState = payrollFallback.emptyState;
      aiInsight = payrollFallback.aiInsight;
      bullets = [];
    } else {
      const sentences = body.split(/(?<=\.)\s+/).filter(Boolean);
      if (sentences.length > 1) bullets = sentences;
      else if (body.includes('|')) bullets = body.split('|').map((b) => b.trim());
      else if (body.length > 0 && !/^(payroll|latest period)/i.test(body)) bullets = [body];
      aiInsight = buildAiInsightFallback(data, category);
    }
  }

  if (data.context?.period) {
    dateChips = [formatPeriodLabel(data.context.period), ...dateChips].filter(
      (v, i, arr) => arr.indexOf(v) === i
    );
  }

  return {
    category,
    title,
    rankings,
    kpis,
    bullets: bullets.filter((b) => b && !/did you mean/i.test(b)),
    badges,
    dateChips,
    emptyState,
    aiInsight,
    followUps: followUpsFor(data, meta, title),
    isClarification: false,
    clarificationOptions: [],
    isError,
  };
}
