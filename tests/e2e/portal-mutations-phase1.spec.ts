import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../config/loadConfig.mjs';
import {
  createDailyTaskTemplate,
  createOpenPayrollPeriod,
  createTestStaff,
  getFirstPendingOvertime,
  ownerGetFirstOutlet,
  ownerLogin,
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
  await panel.getByPlaceholder('Search…').fill('');
  await panel.getByRole('button', { name: optionPattern }).first().click();
}

test.describe('Portal mutations phase 1', () => {
  test.beforeEach(() => {
    const config = loadTestConfig();
    test.skip(!config.allowMutations, 'Mutations blocked for this environment');
  });

  test('sops — create SOP bundle', async ({ page }) => {
    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const staff = await createTestStaff(token, outlet.id, 'SOPStaff');
    const task = await createDailyTaskTemplate(token, outlet.id, {
      title: `E2E SOP Task ${Date.now()}`,
      assignToEmployeeId: staff.employeeId,
      parentRoleId: staff.parentRoleId,
    });
    const sopName = `E2E SOP ${Date.now()}`;

    await page.goto('/owner/sops');
    await expect(page.getByRole('heading', { name: 'SOPs', level: 1 })).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /create sop/i }).click();
    await page.getByPlaceholder('e.g. Opening checklist').fill(sopName);

    await pickMultiSelectFirst(page, /search & select tasks/i, new RegExp(task.title.slice(0, 12)));
    await pickMultiSelectFirst(page, /select master role/i, /.+/);

    const createResponse = page.waitForResponse(
      (r) => r.url().includes('/task/template-group/create') && r.request().method() === 'POST' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /save sop/i }).click();
    await createResponse;

    await expect(page.getByText(sopName, { exact: false })).toBeVisible({ timeout: 20_000 });
  });

  test('issues — status change and send message', async ({ page }) => {
    const title = `E2E Issue Flow ${Date.now()}`;
    const message = `E2E chat ${Date.now()}`;

    await page.goto('/owner/issues');
    await expect(page.getByRole('heading', { name: 'Issues', level: 1 })).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /new issue/i }).click();
    await page.getByPlaceholder('e.g. AC not working in kitchen').fill(title);
    await page.getByPlaceholder('Provide details about the issue...').fill('Automation workflow test');
    const createResponse = page.waitForResponse(
      (r) => r.url().includes('/issues') && r.request().method() === 'POST' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /create issue/i }).click();
    await createResponse;

    await page.getByRole('button').filter({ hasText: title }).first().click();
    const startProgress = page.getByRole('button', { name: 'Start Progress' });
    if (await startProgress.isVisible().catch(() => false)) {
      const statusResponse = page.waitForResponse(
        (r) => r.url().includes('/issues/') && r.url().includes('/status') && r.request().method() === 'POST' && r.ok(),
        { timeout: 30_000 },
      );
      await startProgress.click();
      await statusResponse;
    } else {
      await expect(page.getByRole('button', { name: 'Resolve' })).toBeVisible({ timeout: 15_000 });
    }

    await page.getByPlaceholder('Type a message...').fill(message);
    const msgResponse = page.waitForResponse(
      (r) => r.url().includes('/messages') && r.request().method() === 'POST' && r.ok(),
      { timeout: 30_000 },
    );
    await page
      .locator('div')
      .filter({ has: page.getByPlaceholder('Type a message...') })
      .getByRole('button')
      .last()
      .click();
    await msgResponse;

    await expect(page.getByText(message, { exact: false })).toBeVisible({ timeout: 20_000 });
  });

  test('staff — edit and save changes', async ({ page }) => {
    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const staff = await createTestStaff(token, outlet.id, 'EditStaff');
    const updatedName = `${staff.name} Updated`;

    await page.goto('/owner/staff');
    await expect(page.getByRole('heading', { name: 'Staff', level: 1 })).toBeVisible({ timeout: 30_000 });

    await page.getByPlaceholder('Search by name or phone').fill(staff.phone);
    await expect(page.getByText(staff.name, { exact: false })).toBeVisible({ timeout: 20_000 });

    await page.getByTitle('Edit staff member').first().click();
    await expect(page.getByRole('heading', { name: 'Edit staff' })).toBeVisible();

    await page.getByPlaceholder('Full name').fill(updatedName);
    const saveResponse = page.waitForResponse(
      (r) => r.url().includes('/employee/staff/') && r.request().method() === 'PUT' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /save changes/i }).click();
    await saveResponse;

    await expect(page.getByText(updatedName, { exact: false })).toBeVisible({ timeout: 20_000 });
  });

  test('payroll — process open period via UI', async ({ page }) => {
    test.setTimeout(180_000);
    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const period = await createOpenPayrollPeriod(token, outlet.id);

    const periodDetail = page.waitForResponse(
      (r) =>
        r.url().includes(`/payroll/outlet/${outlet.id}/period/${period.periodId}`) &&
        r.request().method() === 'GET' &&
        r.ok(),
      { timeout: 60_000 },
    );

    await page.goto('/owner/payroll');
    await expect(page.getByRole('heading', { name: 'Payroll', level: 1 })).toBeVisible({ timeout: 30_000 });
    await selectPayrollPeriod(page, period.periodStart);
    await periodDetail;

    const processBtn = page.getByRole('button', { name: /^process$/i });
    if (await processBtn.isVisible().catch(() => false)) {
      await processBtn.click();
    }

    await expect(page.getByRole('button', { name: /^lock$/i })).toBeVisible({ timeout: 120_000 });
  });

  test('duty roster — update staff min hours', async ({ page }) => {
    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const staff = await createTestStaff(token, outlet.id, 'RosterStaff');

    await page.goto('/owner/duty-roster');
    await expect(page.getByRole('heading', { name: /duty roster/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByPlaceholder(/search/i).first().fill(staff.name);
    const row = page.locator('tr').filter({ hasText: staff.name });
    await expect(row).toBeVisible({ timeout: 20_000 });

    await row.getByRole('button', { name: /min hours/i }).click();

    const useDefaultCheckbox = page.locator('input[type="checkbox"]').first();
    if (await useDefaultCheckbox.isChecked().catch(() => false)) {
      await useDefaultCheckbox.uncheck();
    }
    await page.locator('input[type="number"]').fill('9');

    const saveResponse = page.waitForResponse(
      (r) => r.url().includes('/employee/staff/') && r.request().method() === 'PUT' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /^save$/i }).click();
    await saveResponse;

    await expect(row.getByRole('button', { name: /min hours.*9h/i })).toBeVisible({ timeout: 20_000 });
  });

  test('analytics — export last 30 days', async ({ page }) => {
    await page.goto('/owner/analytics');
    await expect(page.getByRole('heading', { name: /analytics/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: /export report/i }).click();
    await expect(page.getByRole('heading', { name: /export analytics report/i })).toBeVisible();

    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
    await page.getByRole('button', { name: /last 30 days/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/analytics/i);
  });

  test('reports — today roster view loads staff', async ({ page }) => {
    await page.goto('/owner/reports');
    await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: /today's roster/i }).click();
    await expect(page.getByRole('heading', { name: /staff roster/i })).toBeVisible({ timeout: 20_000 });
  });

  test('attendance — filter by staff name', async ({ page }) => {
    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const staff = await createTestStaff(token, outlet.id, 'AttStaff');

    await page.goto('/owner/attendance');
    await expect(page.getByRole('heading', { name: 'Attendance', level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByPlaceholder(/search staff.*min/i).fill(staff.name);
    await page.getByRole('option').filter({ hasText: staff.name }).first().click({ timeout: 20_000 });
    await expect(page.getByText(staff.name, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('overtime — approve pending request when available', async ({ page }) => {
    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const pending = await getFirstPendingOvertime(token, outlet.id);
    test.skip(!pending, 'No pending overtime requests in staging');

    await page.goto('/owner/overtime');
    await expect(page.getByRole('heading', { name: /overtime approvals/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: new RegExp(pending!.employeeName.slice(0, 10)) }).click();
    await expect(page.getByRole('heading', { name: 'Request Detail' })).toBeVisible();

    const approveResponse = page.waitForResponse(
      (r) => r.url().includes('/overtime/') && r.url().includes('/approve') && r.request().method() === 'PUT' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /^approve$/i }).click();
    await approveResponse;
  });
});
