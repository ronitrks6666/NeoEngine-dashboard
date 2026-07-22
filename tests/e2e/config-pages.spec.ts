import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../config/loadConfig.mjs';

test.describe('Config pages', () => {
  test.beforeEach(() => {
    const config = loadTestConfig();
    test.skip(!config.allowMutations, 'Mutations blocked for this environment');
  });

  test('payroll settings saves', async ({ page }) => {
    await page.goto('/owner/payroll-settings');
    await expect(page.getByRole('heading', { name: 'Payroll Settings', level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    const saveResponse = page.waitForResponse(
      (r) => r.url().includes('/payroll/outlet/') && r.url().includes('/settings') && r.request().method() === 'PUT' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /save changes/i }).click();
    await saveResponse;
    await expect(page.getByRole('button', { name: /saved!/i })).toBeVisible({ timeout: 10_000 });
  });

  test('leave rules saves', async ({ page }) => {
    await page.goto('/owner/leave-rules');
    await expect(page.getByRole('heading', { name: /leave rules/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    const saveResponse = page.waitForResponse(
      (r) => r.url().includes('/leave/rules/') && r.request().method() === 'PUT' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /save rules/i }).click();
    await saveResponse;
    await expect(page.getByRole('button', { name: /saved!/i })).toBeVisible({ timeout: 10_000 });
  });

  test('permissions page loads feature bundles', async ({ page }) => {
    await page.goto('/owner/permissions');
    await expect(page.getByRole('heading', { name: /access permissions/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByPlaceholder('Search name or phone…')).toBeVisible({ timeout: 20_000 });
  });

  test('outlets create modal opens', async ({ page }) => {
    await page.goto('/owner/outlets');
    await expect(page.getByRole('heading', { name: 'Outlets', level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: '+ Create outlet' }).click();
    await expect(page.getByRole('heading', { name: /create outlet/i })).toBeVisible();
  });

  test('staff edit modal opens from list', async ({ page }) => {
    await page.goto('/owner/staff');
    await expect(page.getByRole('heading', { name: 'Staff', level: 1 })).toBeVisible({ timeout: 30_000 });

    const editBtn = page.getByTitle('Edit staff member').first();
    await expect(editBtn).toBeVisible({ timeout: 20_000 });
    await editBtn.click();
    await expect(page.getByRole('heading', { name: 'Edit staff' })).toBeVisible({ timeout: 15_000 });
  });
});
