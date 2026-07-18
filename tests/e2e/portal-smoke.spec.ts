import { test, expect } from '@playwright/test';

/** Owner/staff portal pages — smoke: route loads + primary heading */
const PORTAL_PAGES = [
  { path: '/owner/dashboard', heading: /welcome/i },
  { path: '/owner/tasks', heading: /task/i },
  { path: '/owner/sops', heading: 'SOPs' },
  { path: '/owner/issues', heading: 'Issues' },
  { path: '/owner/staff', heading: 'Staff' },
  { path: '/owner/payroll', heading: 'Payroll' },
  { path: '/owner/events', heading: 'Events' },
  { path: '/owner/briefing-pool', heading: 'Briefing Pool' },
  { path: '/owner/analytics', heading: /analytics/i },
  { path: '/owner/reports', heading: 'Reports' },
  { path: '/owner/attendance', heading: 'Attendance' },
  { path: '/owner/duty-roster', heading: /duty roster/i },
  { path: '/owner/leave', heading: /leave/i },
  { path: '/owner/leave-rules', heading: /leave rules/i },
  { path: '/owner/payroll-settings', heading: /payroll settings/i },
  { path: '/owner/overtime', heading: /overtime/i },
  { path: '/owner/hierarchy', heading: 'Hierarchy' },
  { path: '/owner/activity', heading: /activity/i },
  { path: '/owner/roles', heading: 'Roles' },
  { path: '/owner/departments', heading: /departments/i },
  { path: '/owner/vendors', heading: /vendors/i },
  { path: '/owner/outlets', heading: 'Outlets' },
  { path: '/owner/rules-regulations', heading: /rules/i },
  { path: '/owner/support', heading: /support/i },
  { path: '/owner/permissions', heading: /permissions/i },
] as const;

test.describe.configure({ mode: 'serial' });

test.describe('Owner portal smoke', () => {
  for (const pageDef of PORTAL_PAGES) {
    test(`loads ${pageDef.path}`, async ({ page }) => {
      const apiResponse = page.waitForResponse(
        (r) => r.request().method() === 'GET' && r.ok(),
        { timeout: 45_000 },
      );

      await page.goto(pageDef.path);
      await expect(page.getByRole('heading', { level: 1, name: pageDef.heading })).toBeVisible({
        timeout: 30_000,
      });
      await apiResponse.catch(() => null);
    });
  }
});
