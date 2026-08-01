import { test, expect } from '@playwright/test';

/**
 * Primary UI controls per owner page — modals open, tabs switch, key buttons visible.
 * Complements portal-smoke (load only) and mutation specs (full CRUD on subset).
 */
test.describe.configure({ mode: 'serial' });

async function gotoAndHeading(page: import('@playwright/test').Page, path: string, heading: RegExp | string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 30_000 });
}

async function closeTopModal(page: import('@playwright/test').Page) {
  const overlay = page.locator('.fixed.inset-0').last();
  const namedClose = overlay.getByRole('button', { name: 'Close' });
  if (await namedClose.isVisible().catch(() => false)) {
    await namedClose.click();
  } else {
    await overlay.locator('button').first().click();
  }
  await expect(overlay).toBeHidden({ timeout: 10_000 });
}

test.describe('Portal primary interactions', () => {
  test('dashboard — task range toggle', async ({ page }) => {
    await gotoAndHeading(page, '/owner/dashboard', /welcome/i);
    const weekResponse = page.waitForResponse(
      (r) =>
        r.url().includes('/manager/dashboard-tasks') &&
        r.url().includes('dateRange=week') &&
        r.request().method() === 'GET' &&
        r.ok(),
      { timeout: 30_000 },
    );
    await page.locator('#section-tasks-chart').getByRole('button', { name: 'This week' }).click();
    await weekResponse;
  });

  test('tasks — create task modal', async ({ page }) => {
    await gotoAndHeading(page, '/owner/tasks', /task/i);
    const tab = page.getByRole('tab', { name: /all templates/i });
    if (await tab.isVisible().catch(() => false)) await tab.click();
    await page.getByRole('button', { name: /create task/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Create task' })).toBeVisible();
  });

  test('sops — create SOP modal and deleted tab', async ({ page }) => {
    await gotoAndHeading(page, '/owner/sops', 'SOPs');
    await page.getByRole('button', { name: /create sop/i }).click();
    await expect(page.getByRole('heading', { name: /create sop|edit sop/i })).toBeVisible();
    await closeTopModal(page);
    await page.getByRole('button', { name: /deleted/i }).click();
    await expect(page.getByRole('button', { name: 'Active' })).toBeVisible();
  });

  test('issues — new issue modal', async ({ page }) => {
    await gotoAndHeading(page, '/owner/issues', 'Issues');
    await page.getByRole('button', { name: /new issue/i }).click();
    await expect(page.getByRole('heading', { name: /report an issue/i })).toBeVisible();
  });

  test('staff — add staff modal', async ({ page }) => {
    await gotoAndHeading(page, '/owner/staff', 'Staff');
    await page.getByRole('button', { name: /add staff/i }).click();
    await expect(page.getByRole('heading', { name: 'Add staff member' })).toBeVisible();
  });

  test('payroll — create period modal', async ({ page }) => {
    await gotoAndHeading(page, '/owner/payroll', 'Payroll');
    await page.getByRole('button', { name: /create period/i }).first().click();
    await expect(page.getByRole('heading', { name: /create pay period/i })).toBeVisible();
  });

  test('events — add event modal and history tab', async ({ page }) => {
    await gotoAndHeading(page, '/owner/events', 'Events');
    await page.getByRole('button', { name: /add event/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Event' })).toBeVisible();
    await closeTopModal(page);
    await page.getByRole('button', { name: 'history' }).click();
    await expect(page.getByRole('button', { name: 'upcoming' })).toBeVisible();
  });

  test('briefing pool — search and date filters', async ({ page }) => {
    await gotoAndHeading(page, '/owner/briefing-pool', 'Briefing Pool');
    await expect(page.getByPlaceholder('Search staff...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Daily' })).toBeVisible();
  });

  test('analytics — export report modal', async ({ page }) => {
    await gotoAndHeading(page, '/owner/analytics', /analytics/i);
    await page.getByRole('button', { name: /export report/i }).click();
    await expect(page.getByRole('heading', { name: /export analytics report/i })).toBeVisible();
  });

  test('reports — upcoming leave tab', async ({ page }) => {
    await gotoAndHeading(page, '/owner/reports', 'Reports');
    await page.getByRole('button', { name: /upcoming leave/i }).click();
    await expect(page.getByRole('heading', { name: /upcoming approved leave/i })).toBeVisible();
  });

  test('attendance — export CSV control', async ({ page }) => {
    await gotoAndHeading(page, '/owner/attendance', 'Attendance');
    await expect(page.getByRole('button', { name: /export csv/i })).toBeVisible();
  });

  test('duty roster — search and roster table', async ({ page }) => {
    await gotoAndHeading(page, '/owner/duty-roster', /duty roster/i);
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();
  });

  test('leave — create leave modal and approved filter', async ({ page }) => {
    await gotoAndHeading(page, '/owner/leave', /leave management/i);
    await page.getByRole('button', { name: /create leave/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Leave' })).toBeVisible();
    await closeTopModal(page);
    await page.getByRole('button', { name: /^approved$/i }).click();
  });

  test('leave rules — save rules button', async ({ page }) => {
    await gotoAndHeading(page, '/owner/leave-rules', /leave rules/i);
    await expect(page.getByRole('button', { name: /save rules/i })).toBeVisible();
  });

  test('payroll settings — save changes button', async ({ page }) => {
    await gotoAndHeading(page, '/owner/payroll-settings', /payroll settings/i);
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  });

  test('overtime — filter tabs', async ({ page }) => {
    await gotoAndHeading(page, '/owner/overtime', /overtime approvals/i);
    await page.getByRole('button', { name: 'Approved' }).click();
    await page.getByRole('button', { name: 'All' }).click();
  });

  test('hierarchy — org tree section', async ({ page }) => {
    await gotoAndHeading(page, '/owner/hierarchy', 'Hierarchy');
    await expect(page.getByText(/drag someone onto/i)).toBeVisible({ timeout: 20_000 });
  });

  test('activity — date navigation', async ({ page }) => {
    await gotoAndHeading(page, '/owner/activity', /activity feed/i);
    await page.getByTitle('Previous day').click();
    await expect(page.getByRole('button', { name: 'Today' }).first()).toBeVisible();
  });

  test('roles — create master role modal', async ({ page }) => {
    await gotoAndHeading(page, '/owner/roles', 'Roles');
    await page.getByRole('button', { name: /create master role/i }).click();
    await expect(page.getByRole('heading', { name: /create master role/i })).toBeVisible();
  });

  test('departments — add department modal', async ({ page }) => {
    await gotoAndHeading(page, '/owner/departments', 'Departments');
    await page.getByRole('button', { name: /add department/i }).click();
    await expect(page.getByRole('heading', { name: /new department/i })).toBeVisible();
  });

  test('vendors — add vendor type modal', async ({ page }) => {
    await gotoAndHeading(page, '/owner/vendors', /vendors/i);
    await page.getByRole('button', { name: /add vendor type/i }).click();
    await expect(page.getByRole('heading', { name: /new vendor type/i })).toBeVisible();
  });

  test('outlets — create outlet modal', async ({ page }) => {
    await gotoAndHeading(page, '/owner/outlets', 'Outlets');
    await page.getByRole('button', { name: '+ Create outlet' }).click();
    await expect(page.getByRole('heading', { name: /create outlet/i })).toBeVisible();
  });

  test('rules & regulations — editor and save', async ({ page }) => {
    await gotoAndHeading(page, '/owner/rules-regulations', /rules/i);
    await expect(page.getByRole('button', { name: /^save$/i })).toBeVisible();
  });

  test('support — new ticket modal', async ({ page }) => {
    await gotoAndHeading(page, '/owner/support', /support desk/i);
    await page.getByRole('button', { name: /new ticket/i }).click();
    await expect(page.getByRole('heading', { name: /create support ticket/i })).toBeVisible();
  });

  test('permissions — staff search', async ({ page }) => {
    await gotoAndHeading(page, '/owner/permissions', /access permissions/i);
    await expect(page.getByPlaceholder('Search name or phone…')).toBeVisible();
  });
});
