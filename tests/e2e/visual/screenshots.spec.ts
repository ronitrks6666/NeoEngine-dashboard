import { test, expect, type Page } from '@playwright/test';

const PAGES = [
  { id: 'dashboard', path: '/owner/dashboard', heading: /welcome/i },
  { id: 'staff', path: '/owner/staff', heading: 'Staff' },
  { id: 'tasks', path: '/owner/tasks', heading: /task templates|my tasks today/i },
  { id: 'payroll', path: '/owner/payroll', heading: 'Payroll' },
  { id: 'attendance', path: '/owner/attendance', heading: 'Attendance' },
  { id: 'issues', path: '/owner/issues', heading: 'Issues' },
  { id: 'leave', path: '/owner/leave', heading: /leave/i },
  { id: 'sops', path: '/owner/sops', heading: 'SOPs' },
  { id: 'outlets', path: '/owner/outlets', heading: 'Outlets' },
] as const;

test.describe.configure({ mode: 'serial' });

/** Page body is a direct child of <main> (sibling of sticky header), not header controls. */
function pageContentRoot(page: Page) {
  return page.locator('main > div').filter({ has: page.getByRole('heading', { level: 1 }) });
}

async function waitForPageReady(page: Page, pageId: string) {
  if (pageId === 'dashboard') {
    await expect(page.getByText('Checked in today')).toBeVisible({ timeout: 30_000 });
    const tasksPanel = page.locator('#section-tasks-chart');
    await expect(
      tasksPanel.locator('.recharts-responsive-container').or(tasksPanel.getByText('No tasks in this period')),
    ).toBeVisible({ timeout: 20_000 });
    const punchPanel = page.locator('#section-punch-daily');
    await expect(
      punchPanel.locator('.recharts-responsive-container').or(punchPanel.getByText('No punch data')),
    ).toBeVisible({ timeout: 20_000 });
    return;
  }

  if (pageId === 'payroll') {
    await expect(page.getByText(/payroll period|create period|no payroll/i).first()).toBeVisible({
      timeout: 30_000,
    });
  }
}

test.beforeEach(async ({ page }) => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
});

for (const pageDef of PAGES) {
  test(`screenshot — ${pageDef.id}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(pageDef.path);
    await expect(page.getByRole('heading', { level: 1, name: pageDef.heading })).toBeVisible({
      timeout: 45_000,
    });
    await waitForPageReady(page, pageDef.id);
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const content = pageContentRoot(page);
    await expect(content).toBeVisible();
    await expect(content).toHaveScreenshot(`${pageDef.id}.png`, {
      maxDiffPixelRatio: 0.03,
      // Welcome line includes owner display name — varies by test account.
      mask: pageDef.id === 'dashboard' ? [page.getByRole('heading', { level: 1, name: pageDef.heading })] : [],
    });
  });
}
