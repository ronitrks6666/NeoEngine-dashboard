import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../config/loadConfig.mjs';
import {
  ownerGetFirstOutlet,
  ownerLogin,
  seedPayrollEmployeeWithWork,
} from '../helpers/staging-api.mjs';

function periodSearchLabel(periodStart: string) {
  const d = new Date(`${periodStart}T00:00:00Z`);
  const month = d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
  return `${month} ${d.getUTCFullYear()}`;
}

async function selectPayrollPeriod(page, periodStart: string) {
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

test.describe('Payroll', () => {
  test('payroll page loads period data from API', async ({ page }) => {
    const periodsResponse = page.waitForResponse(
      (r) => r.url().includes('/payroll/outlet/') && r.request().method() === 'GET' && r.ok(),
      { timeout: 45_000 },
    );

    await page.goto('/owner/payroll');
    await expect(page.getByRole('heading', { name: 'Payroll', level: 1 })).toBeVisible({ timeout: 30_000 });
    await periodsResponse;
  });

  test('add payment updates remaining when mutations allowed', async ({ page }) => {
    test.setTimeout(180_000);
    const config = loadTestConfig();
    test.skip(!config.allowMutations, 'Mutations blocked for this environment');

    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const seeded = await seedPayrollEmployeeWithWork(token, outlet.id, outlet.raw);

    const periodDetail = page.waitForResponse(
      (r) =>
        r.url().includes(`/payroll/outlet/${outlet.id}/period/${seeded.periodId}`) &&
        r.request().method() === 'GET' &&
        r.ok(),
      { timeout: 60_000 },
    );

    await page.goto('/owner/payroll');
    await expect(page.getByRole('heading', { name: 'Payroll', level: 1 })).toBeVisible({ timeout: 30_000 });

    await selectPayrollPeriod(page, seeded.periodStart);
    await periodDetail;

    await page.getByPlaceholder('Search by name or phone').fill(seeded.name);
    await expect(page.getByText(seeded.name, { exact: false }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Add payment' })).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Add payment' }).click();
    await expect(page.getByRole('heading', { name: 'Add Transaction' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: seeded.name }).click();

    await page.getByPlaceholder('0.00').fill('1');
    const paymentResponse = page.waitForResponse(
      (r) => r.url().includes('/payment-v2') && r.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /^confirm$/i }).click();
    const res = await paymentResponse;
    expect(res.ok(), `Add payment failed: ${res.status()}`).toBeTruthy();
  });
});
