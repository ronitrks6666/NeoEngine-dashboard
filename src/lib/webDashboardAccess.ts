export const WEB_DASHBOARD_ACCESS_DENIED_MESSAGE =
  "You don't have access to the web dashboard. Please use the NeoEngine mobile app or contact your administrator.";

/** Any enabled manager* or web* permission grants web dashboard access. */
export function hasWebDashboardAccess(
  permissions: Record<string, boolean | undefined> | null | undefined
): boolean {
  if (!permissions) return false;
  return Object.entries(permissions).some(
    ([key, val]) => !!val && (key.startsWith('manager') || key.startsWith('web'))
  );
}

/** Owner routes → required web* permission key(s). Omitted routes are owner-only. */
export const OWNER_ROUTE_WEB_PERMISSIONS: Record<string, string | string[]> = {
  '/owner/dashboard': 'webDashboard',
  '/owner/tasks': 'webTasks',
  '/owner/sops': 'webSops',
  '/owner/issues': 'webIssues',
  '/owner/staff': 'webStaff',
  '/owner/payroll': 'webPayroll',
  '/owner/events': 'webEvents',
  '/owner/briefing-pool': 'webBriefingPool',
  '/owner/analytics': 'webAnalytics',
  '/owner/reports': 'webReports',
  '/owner/attendance': 'webAttendance',
  '/owner/leave': 'webLeave',
  '/owner/leave-rules': 'webLeaveRules',
  '/owner/payroll-settings': 'webPayrollSettings',
  '/owner/overtime': 'webOvertime',
  '/owner/hierarchy': ['webHierarchy', 'webStaff', 'webRoles'],
  '/owner/activity': 'webActivity',
  '/owner/roles': 'webRoles',
  '/owner/departments': 'webDepartments',
  '/owner/vendors': 'webVendors',
  '/owner/outlets': 'webOutlets',
  '/owner/support': 'webSupport',
  '/owner/duty-roster': 'webDutyRoster',
  '/owner/rules-regulations': 'webRulesRegulations',
};

export function hasOwnerRouteAccess(
  routePath: string,
  permissions: Record<string, boolean | undefined> | null | undefined,
  role: 'OWNER' | 'EMPLOYEE' | 'SUPER_ADMIN' | null
): boolean {
  if (role === 'OWNER' || role === 'SUPER_ADMIN') return true;
  if (role !== 'EMPLOYEE') return false;

  const required = OWNER_ROUTE_WEB_PERMISSIONS[routePath];
  if (!required) return false;

  const keys = Array.isArray(required) ? required : [required];
  return keys.some((k) => !!permissions?.[k]);
}

export function filterOwnerNavForEmployee<T extends { to: string }>(
  items: T[],
  permissions: Record<string, boolean | undefined> | null | undefined,
  role: 'OWNER' | 'EMPLOYEE' | 'SUPER_ADMIN' | null
): T[] {
  if (role !== 'EMPLOYEE') return items;
  return items.filter((item) => hasOwnerRouteAccess(item.to, permissions, role));
}

/** First owner route the employee may open based on web* flags. */
export function getDefaultEmployeeDashboardPath(
  permissions: Record<string, boolean | undefined> | null | undefined
): string {
  const routes: { perm: string; path: string }[] = [
    { perm: 'webDashboard', path: '/owner/dashboard' },
    { perm: 'webTasks', path: '/owner/tasks' },
    { perm: 'webSops', path: '/owner/sops' },
    { perm: 'webBriefingPool', path: '/owner/briefing-pool' },
    { perm: 'webStaff', path: '/owner/staff' },
    { perm: 'webVendors', path: '/owner/vendors' },
    { perm: 'webDutyRoster', path: '/owner/duty-roster' },
    { perm: 'webAttendance', path: '/owner/attendance' },
    { perm: 'webLeave', path: '/owner/leave' },
    { perm: 'webPayroll', path: '/owner/payroll' },
    { perm: 'webIssues', path: '/owner/issues' },
    { perm: 'webAnalytics', path: '/owner/analytics' },
    { perm: 'webActivity', path: '/owner/activity' },
  ];
  for (const r of routes) {
    if (permissions?.[r.perm]) return r.path;
  }
  return '/owner/dashboard';
}
