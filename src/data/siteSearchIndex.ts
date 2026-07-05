/**
 * Static site navigation index — no API calls. Keeps global search instant and lightweight.
 */
import { hasOwnerRouteAccess } from '@/lib/webDashboardAccess';

export type AppRole = 'OWNER' | 'SUPER_ADMIN';

export type SiteSearchItem = {
  /** Router path */
  path: string;
  /** Primary label */
  title: string;
  /** Short hint shown in dropdown */
  subtitle: string;
  /** Lowercase synonyms / phrases users may type */
  keywords: string[];
  roles: AppRole[];
};

const OWNER: AppRole[] = ['OWNER'];
const SUPER: AppRole[] = ['SUPER_ADMIN'];

export const SITE_SEARCH_INDEX: SiteSearchItem[] = [
  {
    path: '/owner/dashboard',
    title: 'Dashboard',
    subtitle: 'Overview, today summary, alerts',
    keywords: ['home', 'overview', 'summary', 'manager', 'today', 'main'],
    roles: OWNER,
  },
  {
    path: '/owner/tasks',
    title: 'Tasks',
    subtitle: 'Task templates, assignments, checklist',
    keywords: ['templates', 'checklist', 'todo', 'daily tasks', 'assign', 'create task'],
    roles: OWNER,
  },
  {
    path: '/owner/sops',
    title: 'SOPs',
    subtitle: 'Standard operating procedures, bundled tasks, schedules',
    keywords: ['sop', 'standard operating procedure', 'bundle', 'template group', 'procedures', 'acknowledgment'],
    roles: OWNER,
  },
  {
    path: '/owner/issues',
    title: 'Issues',
    subtitle: 'Operational issues, complaints, resolution tracking',
    keywords: ['complaints', 'problems', 'tickets', 'incidents', 'raise issue', 'open issues'],
    roles: OWNER,
  },
  {
    path: '/owner/staff',
    title: 'Staff',
    subtitle: 'Employees, team, documents, roles assignment',
    keywords: ['employees', 'team', 'people', 'workers', 'add staff', 'hr', 'import staff'],
    roles: OWNER,
  },
  {
    path: '/owner/payroll',
    title: 'Payroll',
    subtitle: 'Pay periods, salary, payments, lock',
    keywords: ['pay', 'salary', 'wages', 'payment', 'period', 'earn', 'net pay', 'process payroll'],
    roles: OWNER,
  },
  {
    path: '/owner/payroll-settings',
    title: 'Pay Settings',
    subtitle: 'Payroll rules, rates, deductions configuration',
    keywords: ['payroll settings', 'pay settings', 'deductions', 'rates', 'salary rules', 'pay config'],
    roles: OWNER,
  },
  {
    path: '/owner/events',
    title: 'Events',
    subtitle: 'Outlet events, celebrations, announcements',
    keywords: ['celebration', 'announcement', 'calendar event', 'occasion', 'party'],
    roles: OWNER,
  },
  {
    path: '/owner/briefing-pool',
    title: 'Briefing Pool',
    subtitle: 'Escalated and incomplete tasks by staff',
    keywords: ['briefing', 'escalation', 'pending tasks', 'attention', 'not done'],
    roles: OWNER,
  },
  {
    path: '/owner/operations-ai',
    title: 'Operations AI',
    subtitle: 'Ask questions about attendance, payroll, tasks, and operations',
    keywords: [
      'ai',
      'chatbot',
      'assistant',
      'ask',
      'who is absent',
      'payroll summary',
      'attendance trend',
      'operations chat',
      'neo ai',
      'ops ai',
    ],
    roles: OWNER,
  },
  {
    path: '/owner/analytics',
    title: 'Analytics',
    subtitle: 'Charts, hours, compliance, labor cost',
    keywords: ['reports', 'stats', 'metrics', 'charts', 'insights', 'kpi', 'trends'],
    roles: OWNER,
  },
  {
    path: '/owner/reports',
    title: 'Reports',
    subtitle: 'Exports and reporting',
    keywords: ['export', 'csv', 'download', 'summary report'],
    roles: OWNER,
  },
  {
    path: '/owner/attendance',
    title: 'Attendance',
    subtitle: 'Punch in/out, today activity, breaks',
    keywords: ['punch', 'clock', 'time', 'present', 'absent', 'break', 'shifts', 'late'],
    roles: OWNER,
  },
  {
    path: '/owner/duty-roster',
    title: 'Duty Roster',
    subtitle: 'Shift times, weekly off, role slots per staff',
    keywords: ['roster', 'schedule', 'weekly off', 'punch in time', 'hours', 'shift'],
    roles: OWNER,
  },
  {
    path: '/owner/leave',
    title: 'Leave',
    subtitle: 'Leave requests, approve, reject, holidays',
    keywords: ['time off', 'vacation', 'pto', 'absence', 'holiday', 'approve leave'],
    roles: OWNER,
  },
  {
    path: '/owner/leave-rules',
    title: 'Leave Rules',
    subtitle: 'Leave policies, quotas, accrual rules',
    keywords: ['leave policy', 'leave quota', 'accrual', 'leave types', 'leave settings'],
    roles: OWNER,
  },
  {
    path: '/owner/overtime',
    title: 'Overtime',
    subtitle: 'Overtime requests, approvals, extra hours',
    keywords: ['ot', 'extra hours', 'over time', 'approve overtime'],
    roles: OWNER,
  },
  {
    path: '/owner/hierarchy',
    title: 'Hierarchy',
    subtitle: 'Org structure, reporting lines',
    keywords: ['org', 'organization', 'structure', 'tree', 'chain', 'reports to'],
    roles: OWNER,
  },
  {
    path: '/owner/permissions',
    title: 'Permissions',
    subtitle: 'Mobile app feature access per staff member',
    keywords: ['access', 'features', 'screens', 'staff permissions', 'mobile', 'flags', 'toggle'],
    roles: OWNER,
  },
  {
    path: '/owner/activity',
    title: 'Activity',
    subtitle: 'Staff activity log, audit trail, timeline',
    keywords: ['activity log', 'audit', 'timeline', 'history', 'actions'],
    roles: OWNER,
  },
  {
    path: '/owner/roles',
    title: 'Roles',
    subtitle: 'Master roles and job types',
    keywords: ['jobs', 'positions', 'titles', 'master role', 'chef', 'waiter'],
    roles: OWNER,
  },
  {
    path: '/owner/departments',
    title: 'Departments',
    subtitle: 'Department structure and grouping',
    keywords: ['dept', 'division', 'team structure', 'kitchen', 'front of house'],
    roles: OWNER,
  },
  {
    path: '/owner/vendors',
    title: 'Vendors',
    subtitle: 'Supplier contacts, vendor types, procurement',
    keywords: ['suppliers', 'vendor', 'procurement', 'contacts', 'phone book'],
    roles: OWNER,
  },
  {
    path: '/owner/outlets',
    title: 'Outlets',
    subtitle: 'Locations, stores, geofence, pay cycle',
    keywords: ['locations', 'stores', 'branches', 'restaurant', 'retail', 'address', 'create outlet'],
    roles: OWNER,
  },
  {
    path: '/owner/rules-regulations',
    title: 'Rules & Regulations',
    subtitle: 'Outlet policies for staff in the app',
    keywords: ['rules', 'regulations', 'policy', 'handbook', 'compliance'],
    roles: OWNER,
  },
  {
    path: '/owner/support',
    title: 'Support',
    subtitle: 'Help tickets, contact NeoEngine support',
    keywords: ['help', 'ticket', 'contact support', 'customer service', 'raise ticket'],
    roles: OWNER,
  },
  {
    path: '/super-admin/dashboard',
    title: 'Super Admin — Dashboard',
    subtitle: 'Platform overview',
    keywords: ['home', 'admin', 'overview'],
    roles: SUPER,
  },
  {
    path: '/super-admin/owners',
    title: 'Super Admin — Owners',
    subtitle: 'Manage restaurant owners',
    keywords: ['accounts', 'customers', 'tenants', 'users'],
    roles: SUPER,
  },
  {
    path: '/super-admin/outlets',
    title: 'Super Admin — Outlets',
    subtitle: 'All outlets across platform',
    keywords: ['locations', 'stores', 'branches'],
    roles: SUPER,
  },
  {
    path: '/super-admin/subscriptions',
    title: 'Super Admin — Subscriptions',
    subtitle: 'Plans, billing, subscription management',
    keywords: ['billing', 'plans', 'subscription', 'pricing', 'renewal'],
    roles: SUPER,
  },
  {
    path: '/super-admin/coupons',
    title: 'Super Admin — Coupons',
    subtitle: 'Discount codes and promotional coupons',
    keywords: ['coupon', 'discount', 'promo', 'promotion code', 'voucher'],
    roles: SUPER,
  },
  {
    path: '/super-admin/sub-admins',
    title: 'Super Admin — Sub Admins',
    subtitle: 'Delegated admin accounts and access',
    keywords: ['sub admin', 'delegated', 'admin users', 'permissions'],
    roles: SUPER,
  },
  {
    path: '/super-admin/support',
    title: 'Super Admin — Support Tickets',
    subtitle: 'Platform support requests from owners',
    keywords: ['help', 'tickets', 'customer support', 'issues'],
    roles: SUPER,
  },
  {
    path: '/super-admin/audit-logs',
    title: 'Super Admin — Audit Logs',
    subtitle: 'Platform activity and change history',
    keywords: ['audit', 'logs', 'history', 'activity', 'changes'],
    roles: SUPER,
  },
  {
    path: '/super-admin/analytics',
    title: 'Super Admin — Analytics',
    subtitle: 'Platform-wide analytics',
    keywords: ['stats', 'metrics', 'reports', 'insights'],
    roles: SUPER,
  },
];

const MAX_RESULTS = 10;

function normalize(q: string): string {
  return q.trim().toLowerCase();
}

function itemHaystack(item: SiteSearchItem): string {
  return [
    item.title,
    item.subtitle,
    item.path.replace(/\//g, ' '),
    ...item.keywords,
  ]
    .join(' ')
    .toLowerCase();
}

function scoreItem(item: SiteSearchItem, q: string): number {
  if (!q) return 0;
  const title = item.title.toLowerCase();
  const hay = itemHaystack(item);
  const tokens = q.split(/\s+/).filter((t) => t.length > 0);

  if (title === q) return 120;
  if (title.startsWith(q)) return 110;
  if (title.includes(q)) return 95;
  if (hay.includes(q)) return 75;
  if (tokens.length && tokens.every((t) => hay.includes(t))) return 55;
  return 0;
}

/** O(n) over a small static list — no network, no workers. */
export function getSiteSearchMatches(
  rawQuery: string,
  role: AppRole,
  options?: {
    authRole?: 'OWNER' | 'EMPLOYEE' | 'SUPER_ADMIN' | null;
    permissions?: Record<string, boolean | undefined> | null;
    limit?: number;
  }
): SiteSearchItem[] {
  const q = normalize(rawQuery);
  if (q.length < 1) return [];

  const limit = options?.limit ?? MAX_RESULTS;
  const scored: { item: SiteSearchItem; score: number }[] = [];
  for (const item of SITE_SEARCH_INDEX) {
    if (!item.roles.includes(role)) continue;
    if (
      options?.authRole === 'EMPLOYEE' &&
      !hasOwnerRouteAccess(item.path, options.permissions, 'EMPLOYEE')
    ) {
      continue;
    }
    const score = scoreItem(item, q);
    if (score > 0) scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  return scored.slice(0, limit).map((s) => s.item);
}
