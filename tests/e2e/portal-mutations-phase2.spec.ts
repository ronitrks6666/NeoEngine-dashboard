import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../config/loadConfig.mjs';
import {
  createTestStaff,
  ownerGetFirstOutlet,
  ownerLogin,
  seedPayrollEmployeeWithWork,
  settlePayrollEmployee,
} from '../helpers/staging-api.mjs';

function periodSearchLabel(periodStart: string) {
  const d = new Date(`${periodStart}T00:00:00Z`);
  const month = d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
  return `${month} ${d.getUTCFullYear()}`;
}

async function selectPayrollPeriod(page: import('@playwright/test').Page, periodStart: string) {
  const search = periodSearchLabel(periodStart);
  const periodTrigger = page
    .locator('label')
    .filter({ hasText: /payroll period/i })
    .locator('..')
    .getByRole('button')
    .first();
  await periodTrigger.click();
  await page.getByPlaceholder('Search periods…').fill(search);
  await page.getByRole('option', { name: new RegExp(search.replace(' ', '.*')) }).first().click();
}

async function pickMultiSelectFirst(
  page: import('@playwright/test').Page,
  triggerPattern: RegExp,
  optionPattern: RegExp,
) {
  await page.getByRole('button', { name: triggerPattern }).click();
  const panel = page.locator('.overflow-hidden.rounded-xl.border.border-emerald-100').last();
  await panel.getByPlaceholder(/search/i).fill('');
  await panel.getByRole('button', { name: optionPattern }).first().click();
}

test.describe('Portal mutations phase 2', () => {
  test.beforeEach(() => {
    const config = loadTestConfig();
    test.skip(!config.allowMutations, 'Mutations blocked for this environment');
  });

  test('permissions — toggle and save staff access', async ({ page }) => {
    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const staff = await createTestStaff(token, outlet.id, 'PermStaff');

    await page.goto('/owner/permissions');
    await expect(page.getByRole('heading', { name: /access permissions/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByPlaceholder('Search name or phone…').fill(staff.name);
    await page.getByRole('button', { name: new RegExp(staff.name) }).first().click();
    await expect(page.getByText('App & web (shared)')).toBeVisible({ timeout: 20_000 });

    const homeRow = page.locator('.py-3.border-b').filter({ hasText: 'Home & dashboard' });
    await homeRow.getByRole('button', { name: 'Manager' }).click();

    const saveResponse = page.waitForResponse(
      (r) => r.url().includes('/feature-permissions') && r.request().method() === 'PUT' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /^save$/i }).click();
    await saveResponse;

    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10_000 });
  });

  test('activity — custom date range apply', async ({ page }) => {
    await page.goto('/owner/activity');
    await expect(page.getByRole('heading', { name: /activity feed/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: /custom range/i }).click();
    await expect(page.getByRole('heading', { name: 'Custom date range' })).toBeVisible();

    const activityResponse = page.waitForResponse(
      (r) => r.url().includes('/activity/') && r.request().method() === 'GET' && r.ok(),
      { timeout: 45_000 },
    );
    await page.getByRole('button', { name: /^apply$/i }).click();
    await activityResponse;
  });

  test('hierarchy — set direct report to owner', async ({ page }) => {
    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const staff = await createTestStaff(token, outlet.id, 'HierStaff');

    await page.goto('/owner/hierarchy');
    await expect(page.getByRole('heading', { name: 'Hierarchy', level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByTitle('Add someone who reports to you').click();
    await expect(page.getByRole('heading', { name: 'Set direct report' })).toBeVisible();

    await pickMultiSelectFirst(page, /select one or more/i, new RegExp(staff.name.slice(0, 12)));
    await page.getByRole('heading', { name: 'Set direct report' }).click();

    const saveResponse = page.waitForResponse(
      (r) => r.url().includes('/employee/') && r.request().method() === 'PUT' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /^save \(\d+\)/i }).click();
    await saveResponse;
  });

  test('payroll — lock period after settlement', async ({ page }) => {
    test.setTimeout(180_000);
    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const seeded = await seedPayrollEmployeeWithWork(token, outlet.id, outlet.raw);
    await settlePayrollEmployee(token, outlet.id, seeded.employeeId, seeded.periodId);

    await page.goto('/owner/payroll');
    await expect(page.getByRole('heading', { name: 'Payroll', level: 1 })).toBeVisible({ timeout: 30_000 });
    await selectPayrollPeriod(page, seeded.periodStart);

    const lockResponse = page.waitForResponse(
      (r) => r.url().includes('/lock') && r.request().method() === 'POST' && r.ok(),
      { timeout: 60_000 },
    );
    await page.getByRole('button', { name: /^lock$/i }).click();
    await lockResponse;
  });

  test('staff — deactivate and reactivate', async ({ page }) => {
    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const staff = await createTestStaff(token, outlet.id, 'DelStaff');

    await page.goto('/owner/staff');
    await expect(page.getByRole('heading', { name: 'Staff', level: 1 })).toBeVisible({ timeout: 30_000 });

    await page.getByPlaceholder('Search by name or phone').fill(staff.phone);
    await expect(page.getByText(staff.name, { exact: false })).toBeVisible({ timeout: 20_000 });

    await page.getByTitle('Delete staff member').first().click();
    await expect(page.getByText(`Delete ${staff.name}?`)).toBeVisible();

    const deleteResponse = page.waitForResponse(
      (r) => r.url().includes('/employee/staff/') && r.request().method() === 'PUT' && r.ok(),
      { timeout: 30_000 },
    );
    await page.locator('.fixed.inset-0').last().getByRole('button', { name: 'Delete staff', exact: true }).click();
    await deleteResponse;

    await page.getByRole('button', { name: /see deleted staff/i }).click();
    await expect(page.getByText(staff.name, { exact: false })).toBeVisible({ timeout: 20_000 });

    const restoreResponse = page.waitForResponse(
      (r) => r.url().includes('/employee/staff/') && r.request().method() === 'PUT' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /reactivate/i }).first().click();
    await restoreResponse;
  });

  test('tasks — create daily template assigned to role', async ({ page }) => {
    const title = `E2E Daily ${Date.now()}`;

    await page.goto('/owner/tasks');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });

    const allTemplatesTab = page.getByRole('tab', { name: /all templates/i });
    if (await allTemplatesTab.isVisible().catch(() => false)) {
      await allTemplatesTab.click();
    }

    await page.getByRole('button', { name: /create task/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Create task' })).toBeVisible();
    await page.getByPlaceholder('e.g. Cut vegetables').fill(title);
    await pickMultiSelectFirst(page, /search & select roles/i, /.+/);

    const createResponse = page.waitForResponse(
      (r) => r.url().includes('/task/template/create') && r.request().method() === 'POST' && r.ok(),
      { timeout: 30_000 },
    );
    await page.locator('form').getByRole('button', { name: 'Create task', exact: true }).click();
    await createResponse;

    await page.getByPlaceholder('Search templates by title or description').fill(title);
    await expect(page.getByText(title, { exact: false })).toBeVisible({ timeout: 20_000 });
  });

  test('site search — jump to tasks page', async ({ page }) => {
    await page.goto('/owner/dashboard');
    await expect(page.getByRole('heading', { name: /welcome/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByPlaceholder('Search pages…').fill('tasks');
    await page.getByRole('option').filter({ hasText: /tasks/i }).first().click();

    await expect(page).toHaveURL(/\/owner\/tasks/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
  });

  test('duty roster — team shift defaults panel opens confirm dialog', async ({ page }) => {
    await page.goto('/owner/duty-roster');
    await expect(page.getByRole('heading', { name: /duty roster/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: /team shift defaults/i }).click();
    await expect(page.getByRole('button', { name: /save outlet default only/i })).toBeVisible();

    await page.getByRole('button', { name: /save outlet default only/i }).click();
    const confirmModal = page.locator('.fixed.inset-0').filter({ hasText: /update outlet default/i });
    await expect(confirmModal).toBeVisible({ timeout: 10_000 });
    await expect(confirmModal.getByRole('button', { name: /^confirm$/i })).toBeVisible();

    await confirmModal.getByRole('button', { name: /^cancel$/i }).click();
    await expect(confirmModal).toBeHidden({ timeout: 10_000 });
  });
});
