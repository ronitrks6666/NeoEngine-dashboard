/**
 * Static site navigation index — no API calls. Keeps global search instant and lightweight.
 */
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
    path: '/owner/outlets',
    title: 'Outlets',
    subtitle: 'Locations, stores, geofence, pay cycle',
    keywords: ['locations', 'stores', 'branches', 'restaurant', 'retail', 'address', 'create outlet'],
    roles: OWNER,
  },
  {
    path: '/owner/staff',
    title: 'Staff',
    subtitle: 'Employees, team, documents, roles assignment',
    keywords: ['employees', 'team', 'people', 'workers', 'add staff', 'hr'],
    roles: OWNER,
  },
  {
    path: '/owner/roles',
    title: 'Roles',
    subtitle: 'Job roles and permissions',
    keywords: ['jobs', 'positions', 'titles', 'permissions', 'active roles'],
    roles: OWNER,
  },
  {
    path: '/owner/tasks',
    title: 'Tasks',
    subtitle: 'Task templates, assignments, checklist',
    keywords: ['templates', 'checklist', 'todo', 'daily tasks', 'assign'],
    roles: OWNER,
  },
  {
    path: '/owner/attendance',
    title: 'Attendance',
    subtitle: 'Punch in/out, today activity, breaks',
    keywords: ['punch', 'clock', 'time', 'present', 'absent', 'break', 'shifts'],
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
    path: '/owner/hierarchy',
    title: 'Hierarchy',
    subtitle: 'Org structure, reporting lines',
    keywords: ['org', 'organization', 'structure', 'tree', 'chain'],
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
    path: '/owner/payroll',
    title: 'Payroll',
    subtitle: 'Pay periods, salary, payments, lock',
    keywords: ['pay', 'salary', 'wages', 'payment', 'period', 'earn', 'net pay', 'process payroll'],
    roles: OWNER,
  },
  {
    path: '/owner/analytics',
    title: 'Analytics',
    subtitle: 'Charts, hours, compliance, labor cost',
    keywords: ['reports', 'stats', 'metrics', 'charts', 'insights', 'kpi'],
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
    path: '/owner/permissions',
    title: 'Permissions',
    subtitle: 'Mobile app feature access per staff member',
    keywords: ['access', 'features', 'screens', 'roles', 'staff permissions', 'mobile', 'flags', 'toggle'],
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
    path: '/super-admin/analytics',
    title: 'Super Admin — Analytics',
    subtitle: 'Platform-wide analytics',
    keywords: ['stats', 'metrics', 'reports'],
    roles: SUPER,
  },
];

const MAX_RESULTS = 8;

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
export function getSiteSearchMatches(rawQuery: string, role: AppRole, limit = MAX_RESULTS): SiteSearchItem[] {
  const q = normalize(rawQuery);
  if (q.length < 1) return [];

  const scored: { item: SiteSearchItem; score: number }[] = [];
  for (const item of SITE_SEARCH_INDEX) {
    if (!item.roles.includes(role)) continue;
    const score = scoreItem(item, q);
    if (score > 0) scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  return scored.slice(0, limit).map((s) => s.item);
}
