import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../config/loadConfig.mjs';

test.describe('Staff', () => {
  test('staff page loads and add-staff modal opens', async ({ page }) => {
    const periods = page.waitForResponse(
      (r) => r.url().includes('/employee/') && r.request().method() === 'GET' && r.ok(),
      { timeout: 45_000 },
    );

    await page.goto('/owner/staff');
    await periods.catch(() => null);

    await expect(page.getByRole('heading', { name: 'Staff', level: 1 })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /add staff/i }).click();
    await expect(page.getByRole('heading', { name: 'Add staff member' })).toBeVisible();
  });

  test('create staff when mutations allowed', async ({ page }) => {
    const config = loadTestConfig();
    test.skip(!config.allowMutations, 'Mutations blocked for this environment');

    const suffix = String(Date.now()).slice(-9);
    const name = `E2E Staff ${suffix}`;
    const phone = `9${suffix}`;

    await page.goto('/owner/staff');
    await expect(page.getByRole('heading', { name: 'Staff', level: 1 })).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /add staff/i }).click();
    await page.getByPlaceholder('Full name').fill(name);
    await page.getByPlaceholder('10-digit number').fill(phone);
    await page.getByPlaceholder('Default: staff123').fill('staff123');

    const createResponse = page.waitForResponse(
      (r) => r.url().includes('/employee/create') && r.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /^create$/i }).click();
    const res = await createResponse;
    expect(res.ok(), `Create staff failed: ${res.status()}`).toBeTruthy();

    await expect(page.getByRole('heading', { name: 'Add staff member' })).toBeHidden({
      timeout: 15_000,
    });

    const listRefresh = page.waitForResponse(
      (r) => r.url().includes('/employee/') && r.request().method() === 'GET' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByPlaceholder('Search by name or phone').fill(phone);
    await listRefresh.catch(() => null);

    await expect(page.getByText(name, { exact: false })).toBeVisible({ timeout: 20_000 });
  });
});
